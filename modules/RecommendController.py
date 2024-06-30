# 작성자: [전지훈]
# 수정한 날짜: [2024-06-30]
# 코드 용도: Flask 기반의 웹 애플리케이션을 통해 사용자 정보를 기반으로 주류를 추천하는 시스템을 구현

# 주요 기능:
# 1. 사용자와 주류 정보 데이터를 로드하고 전처리
# 2. TF-IDF 벡터화를 사용하여 주류 특징의 유사도를 계산
# 3. KNN 알고리즘을 사용하여 사용자 기반 협업 필터링을 구현
# 4. Flask 블루프린트를 통해 API 엔드포인트를 설정하고, 사용자 요청을 처리하여 주류 추천 리스트를 반환

import pandas as pd
import logging
from flask import Blueprint, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors
from fuzzywuzzy import fuzz, process
from concurrent.futures import ThreadPoolExecutor

# Flask 블루프린트 설정
RecommendController = Blueprint('RecommendController', __name__)

# 설정 파일 로드
CONFIG = {
    'USR_INFO_PATH': './data/usr_info.csv',
    'WINE_INFO_PATH': './data/wine_info.csv',
    'ERROR_LOADING_DATA': "데이터를 불러오는 중 오류가 발생했습니다.",
    'INVALID_USER_ID': "유효하지 않은 유저 아이디입니다.",
    'USER_NOT_FOUND': "죄송합니다, 해당 유저 정보를 찾을 수 없습니다.",
    'DRINK_NOT_FOUND': "죄송합니다, 해당 주류에 대한 정보를 찾을 수 없습니다.",
    'NO_RECOMMENDATIONS': "죄송합니다, 추천할 주류를 찾을 수 없습니다.",
    'UNKNOWN_COMMAND': "죄송합니다, 이해하지 못했습니다."
}

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)

# 전역 변수 선언
# 이 변수들은 애플리케이션 전체에서 사용되며, 데이터와 모델을 저장
usr_info_df, wine_info_df = None, None
tfidf_vectorizer, wine_features = None, None
knn, user_item_matrix = None, None

try:
    # 사용자 정보와 와인 정보 CSV 파일 로드
    usr_info_df = pd.read_csv(CONFIG['USR_INFO_PATH'])
    wine_info_df = pd.read_csv(CONFIG['WINE_INFO_PATH'])

    # 데이터 전처리
    # 주류 이름과 특징에서 특수 문자를 제거하고 소문자로 변환
    wine_info_df['cleaned_주류이름'] = wine_info_df['주류이름'].str.replace(r'[^\w\s]', '').str.strip().str.lower()
    wine_info_df['cleaned_주류특징'] = wine_info_df['주류특징'].str.replace(r'[^\w\s]', '').str.strip().str.lower()

    # TF-IDF 벡터화
    # 주류 특징을 벡터화하여 유사도 계산에 사용
    tfidf_vectorizer = TfidfVectorizer()
    wine_features = tfidf_vectorizer.fit_transform(wine_info_df['cleaned_주류특징'])

    # 협업 필터링 준비
    # 사용자-아이템 행렬을 생성하고 KNN 모델을 학습
    user_item_matrix = pd.crosstab(index=usr_info_df['유저아이디'], columns=usr_info_df['좋아하는주류이름'])
    knn = NearestNeighbors(metric='cosine', algorithm='brute')
    knn.fit(user_item_matrix.values)
except Exception as e:
    logging.error(f"시작 시 데이터를 불러오는 중 오류가 발생했습니다: {e}")

# 데이터 전처리 함수
def preprocess_data():
    global tfidf_vectorizer, wine_features, knn, user_item_matrix
    # 주류 이름과 특징 정제
    wine_info_df['cleaned_주류이름'] = wine_info_df['주류이름'].str.replace(r'[^\w\s]', '').str.strip().str.lower()
    wine_info_df['cleaned_주류특징'] = wine_info_df['주류특징'].str.replace(r'[^\w\s]', '').str.strip().str.lower()
    # TF-IDF 벡터화 수행
    tfidf_vectorizer = TfidfVectorizer()
    wine_features = tfidf_vectorizer.fit_transform(wine_info_df['cleaned_주류특징'])
    # 사용자-아이템 행렬 생성 및 KNN 모델 학습
    user_item_matrix = pd.crosstab(index=usr_info_df['유저아이디'], columns=usr_info_df['좋아하는주류이름'])
    knn = NearestNeighbors(metric='cosine', algorithm='brute')
    knn.fit(user_item_matrix.values)

# 사용자 데이터 가져오기 함수
def get_user_data(user_id):
    # 유저 아이디를 문자열로 변환하여 일치하는 데이터 반환
    usr_info_df['유저아이디'] = usr_info_df['유저아이디'].astype(str)
    return usr_info_df[usr_info_df['유저아이디'] == str(user_id)]

# 사용자 데이터를 기반으로 추천 주류 리스트 생성 함수
def get_recommendations_for_user(user_data):
    try:
        # 사용자가 좋아하는 주류와 맛 추출
        favorite_drink = user_data['좋아하는주류이름'].values[0].strip().lower()
        favorite_taste = user_data['좋아하는맛'].values[0].strip().lower()

        # 퍼지 매칭을 사용하여 사용자가 좋아하는 주류와 가장 유사한 주류 찾기
        matched_drink_data = process.extractOne(favorite_drink, wine_info_df['cleaned_주류이름'], scorer=fuzz.token_sort_ratio)
        if matched_drink_data is None or matched_drink_data[1] < 50:
            return CONFIG['DRINK_NOT_FOUND']

        matched_drink = matched_drink_data[0]
        favorite_idx = wine_info_df[wine_info_df['cleaned_주류이름'] == matched_drink].index[0]
        
        # 코사인 유사도를 사용하여 유사한 주류 찾기
        cosine_similarities = cosine_similarity(wine_features[favorite_idx], wine_features).flatten()
        similar_indices = cosine_similarities.argsort()[:-6:-1]
        content_based_recs = wine_info_df.iloc[similar_indices]

        # 추천 리스트 생성
        response_list = []
        for rec in content_based_recs.to_dict('records'):
            response_list.append(f"{rec['주류이름']} - {rec['주류특징']} ({rec['주류종류']})")

        # 협업 필터링을 통한 추천
        user_idx = usr_info_df[usr_info_df['유저아이디'] == user_data['유저아이디'].values[0]].index[0]
        distances, indices = knn.kneighbors([user_item_matrix.values[user_idx]], n_neighbors=5)

        for idx in indices.flatten():
            similar_user_id = user_item_matrix.index[idx]
            similar_user_favorites = usr_info_df[usr_info_df['유저아이디'] == similar_user_id]['좋아하는주류이름'].values
            for drink in similar_user_favorites:
                if drink.lower() != favorite_drink and not any(drink.lower() in rec.lower() for rec in response_list):
                    similar_drink_details = wine_info_df[wine_info_df['cleaned_주류이름'].str.contains(drink.lower())]
                    if not similar_drink_details.empty:
                        rec = similar_drink_details.iloc[0]
                        response_list.append(f"{rec['주류이름']} - {rec['주류특징']} ({rec['주류종류']})")

        # 최종 추천 리스트 반환
        return f"고객님의 취향을 기반으로한 추천 리스트를 제공하겠습니다. \n\n" + "\n".join(response_list[:10])

    except Exception as e:
        logging.error(f"추천을 생성하는 중 오류가 발생했습니다: {e}")
        return CONFIG['NO_RECOMMENDATIONS']


# Flask 라우트: 사용자 요청에 따라 주류 추천 리스트 반환
@RecommendController.route("/recommendations", methods=['POST'])
def get_recommendations():
    # 요청에서 사용자 ID와 메시지 추출
    data = request.get_json()
    user_id = data.get('user_id')
    user_message = data.get('message')

    # 사용자 메시지가 "주류 추천"이 아닌 경우 오류 반환
    if not user_message == "주류 추천":
        return jsonify({"response": CONFIG['UNKNOWN_COMMAND']})

    # 유효하지 않은 사용자 ID인 경우 오류 반환
    if not user_id:
        return jsonify({"response": CONFIG['INVALID_USER_ID']}), 400

    # 사용자 데이터 조회
    user_data = get_user_data(user_id)
    if user_data.empty:
        return jsonify({"response": CONFIG['USER_NOT_FOUND']})

    # 추천 리스트 생성 및 반환
    bot_response = get_recommendations_for_user(user_data)
    return jsonify({"response": bot_response})
