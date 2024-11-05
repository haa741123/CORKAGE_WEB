# 작성자: [전지훈]
# 수정한 날짜: [2024-06-30]
# 코드 용도: Flask 기반의 웹 애플리케이션을 통해 사용자 정보를 기반으로 주류를 추천하는 시스템을 구현

# 주요 기능:
# 1. 사용자와 주류 정보 데이터를 로드하고 전처리
# 2. TF-IDF 벡터화를 사용하여 주류 특징의 유사도를 계산
# 3. KNN 알고리즘을 사용하여 사용자 기반 협업 필터링을 구현
# 4. Flask 블루프린트를 통해 API 엔드포인트를 설정하고, 사용자 요청을 처리하여 주류 추천 리스트를 반환
# 5. 1일을 기준으로 다른 종류의 주류를 추천해줌

import pandas as pd
import logging
from flask import Blueprint, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors
from fuzzywuzzy import fuzz, process
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Flask 블루프린트 설정
RecommendController = Blueprint('RecommendController', __name__)

# 환경 변수 로드
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Supabase 클라이언트 생성
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# 설정 파일 로드
CONFIG = {
    'USR_INFO_PATH': './data/usr_info.csv',
    'WINE_INFO_PATH': './data/wine_info.csv',
    'ERROR_LOADING_DATA': "데이터를 불러오는 중 오류가 발생했습니다.",
    'INVALID_USER_ID': "유효하지 않은 유저 아이디입니다.",
    'USER_NOT_FOUND': "죄송합니다, 해당 유저 정보를 찾을 수 없습니다.",
    'DRINK_NOT_FOUND': "죄송합니다, 해당 주류에 대한 정보를 찾을 수 없습니다.",
    'NO_RECOMMENDATIONS': "죄송합니다, 추천할 주류를 찾을 수 없습니다.",
    'UNKNOWN_COMMAND': "죄송합니다, 이해하지 못했습니다.",
    'TEST_DATE': '2024-11-02'
}

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)

# 전역 변수 선언
usr_info_df, wine_info_df = None, None
tfidf_vectorizer, wine_features = None, None
knn, user_item_matrix = None, None

# 데이터 로드 및 전처리 함수
def load_and_preprocess_data():
    global usr_info_df, wine_info_df, tfidf_vectorizer, wine_features, knn, user_item_matrix

    try:
        # Supabase에서 데이터 가져오기
        user_data = supabase.table("user_preferences").select("*").execute()
        drink_data = supabase.table("drinks").select("*").execute()

        # DataFrame으로 변환
        usr_info_df = pd.DataFrame(user_data.data)
        wine_info_df = pd.DataFrame(drink_data.data)

        # 데이터 전처리
        wine_info_df['cleaned_name'] = wine_info_df['name'].str.replace(r'[^\w\s]', '').str.strip().str.lower()
        wine_info_df['cleaned_description'] = wine_info_df['description'].str.replace(r'[^\w\s]', '').str.strip().str.lower()

        tfidf_vectorizer = TfidfVectorizer()
        wine_features = tfidf_vectorizer.fit_transform(wine_info_df['cleaned_description'])

        # 사용자 아이템 매트릭스 생성 및 KNN 모델 학습
        user_item_matrix = pd.crosstab(index=usr_info_df['user_id'], columns=usr_info_df['favorite_drink_name'])
        knn = NearestNeighbors(metric='cosine', algorithm='brute')
        knn.fit(user_item_matrix.values)

        logging.info("데이터가 성공적으로 로드되고 전처리되었습니다.")

    except Exception as e:
        logging.error(f"데이터를 로드하거나 전처리하는 중 오류가 발생했습니다: {e}")




# 초기 데이터 로드 및 전처리
try:
    with ThreadPoolExecutor() as executor:
        future_process = executor.submit(load_and_preprocess_data)
        future_process.result()  # 데이터 로딩 및 전처리가 완료될 때까지 기다림
except Exception as e:
    logging.error(f"시작 시 데이터를 불러오는 중 오류가 발생했습니다: {e}")

# 사용자 데이터 가져오기 함수
def get_user_data(user_id):
    try:
        # Supabase에서 쿠키 기반 user_id에 해당하는 데이터 쿼리
        user_data = supabase.table("user_preferences").select("*").eq("user_id", user_id).execute()
        return pd.DataFrame(user_data.data) if user_data.data else pd.DataFrame()
    except Exception as e:
        logging.error(f"사용자 데이터를 가져오는 중 오류가 발생했습니다: {e}")
        return pd.DataFrame()

# 일별 추천 주류 인덱스를 계산하는 함수
def get_daily_index(max_index):

    # 일별로 주류 추천 결과가 달라지는지 테스트 하기 위해 사용했던 코드
    # test_data = "TEST_MODE"
    # date = datetime.strptime(CONFIG['TEST_DATE'], '%Y-%m-%d')

    date = datetime.now()
    current_day = date.day
    return current_day % max_index if max_index > 0 else 0

# 사용자 데이터를 기반으로 일별 추천 주류 리스트 생성 함수
def get_recommendations_for_user(user_data):
    try:
        favorite_drink = user_data['favorite_drink_name'].values[0].strip().lower()
        matched_drink_data = process.extractOne(favorite_drink, wine_info_df['cleaned_name'], scorer=fuzz.token_sort_ratio)

        if matched_drink_data is None or matched_drink_data[1] < 50:
            return CONFIG['DRINK_NOT_FOUND']

        matched_drink = matched_drink_data[0]
        favorite_idx = wine_info_df[wine_info_df['cleaned_name'] == matched_drink].index[0]

        cosine_similarities = cosine_similarity(wine_features[favorite_idx], wine_features).flatten()
        similar_indices = cosine_similarities.argsort()[:-6:-1]
        content_based_recs = wine_info_df.iloc[similar_indices]

        daily_index = get_daily_index(len(content_based_recs))
        selected_drink = content_based_recs.iloc[daily_index]

        return f"오늘의 추천 주류 \n\n주류이름: {selected_drink['name']}\n특징: {selected_drink['description']}"

    except Exception as e:
        logging.error(f"추천을 생성하는 중 오류가 발생했습니다: {e}")
        return CONFIG['NO_RECOMMENDATIONS']


# 사용자 데이터를 기반으로 일별 추천 주류 하나를 반환하는 함수
def get_single_rec_for_user(user_data):
    try:
        favorite_drink = user_data['favorite_drink_name'].values[0].strip().lower()
        matched_drink_data = process.extractOne(favorite_drink, wine_info_df['cleaned_name'], scorer=fuzz.token_sort_ratio)

        if matched_drink_data is None or matched_drink_data[1] < 50:
            return CONFIG['DRINK_NOT_FOUND']

        matched_drink = matched_drink_data[0]
        favorite_idx = wine_info_df[wine_info_df['cleaned_name'] == matched_drink].index[0]

        cosine_similarities = cosine_similarity(wine_features[favorite_idx], wine_features).flatten()
        similar_indices = cosine_similarities.argsort()[:-6:-1]
        content_based_recs = wine_info_df.iloc[similar_indices]

        daily_index = get_daily_index(len(content_based_recs))
        selected_drink = content_based_recs.iloc[daily_index]

        return {"drink_name": selected_drink['name'], "drink_desc": selected_drink['description']}

    except Exception as e:
        logging.error(f"추천을 생성하는 중 오류가 발생했습니다: {e}")
        return CONFIG['NO_RECOMMENDATIONS']
    

# Flask 라우트: 사용자 요청에 따라 주류 추천 리스트 반환
@RecommendController.route("/recommendations", methods=['POST'])
def get_recommendations():
    data = request.get_json()
    user_id = data.get('user_id')
    user_message = data.get('message')

    if user_message not in ["주류 추천", "rec_wine_list"]:
        return jsonify({"response": CONFIG['UNKNOWN_COMMAND']})

    if not user_id:
        return jsonify({"response": CONFIG['INVALID_USER_ID']}), 400

    user_data = get_user_data(user_id)
    if user_data.empty:
        return jsonify({"response": CONFIG['USER_NOT_FOUND']})

    bot_response = get_recommendations_for_user(user_data) if user_message == "주류 추천" else get_single_rec_for_user(user_data)
    return jsonify({"response": bot_response})
