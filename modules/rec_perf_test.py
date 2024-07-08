import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import os

# 설정 및 파일 경로
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = {
    'USR_INFO_PATH': os.path.join(BASE_DIR, 'data', 'usr_info.csv'),
    'WINE_INFO_PATH': os.path.join(BASE_DIR, 'data', 'wine_info.csv'),
}

def load_data():
    try:
        usr_info_df = pd.read_csv(CONFIG['USR_INFO_PATH'])
        wine_info_df = pd.read_csv(CONFIG['WINE_INFO_PATH'])
        return usr_info_df, wine_info_df
    except FileNotFoundError as e:
        print(f"Error: 파일을 찾을 수 없습니다. {e}")
        print(f"현재 작업 디렉토리: {os.getcwd()}")
        print(f"usr_info.csv 경로: {CONFIG['USR_INFO_PATH']}")
        print(f"wine_info.csv 경로: {CONFIG['WINE_INFO_PATH']}")
        raise

def preprocess_data(usr_info_df, wine_info_df):
    wine_info_df['cleaned_주류이름'] = wine_info_df['주류이름'].str.replace(r'[^\w\s]', '').str.strip().str.lower()
    wine_info_df['cleaned_주류특징'] = wine_info_df['주류특징'].str.replace(r'[^\w\s]', '').str.strip().str.lower()
    tfidf_vectorizer = TfidfVectorizer()
    wine_features = tfidf_vectorizer.fit_transform(wine_info_df['cleaned_주류특징'])
    user_item_matrix = pd.crosstab(index=usr_info_df['유저아이디'], columns=usr_info_df['좋아하는주류이름'])
    knn = NearestNeighbors(metric='cosine', algorithm='brute')
    knn.fit(user_item_matrix.values)
    return tfidf_vectorizer, wine_features, knn, user_item_matrix, wine_info_df

def get_recommendations_for_user(user_data, wine_info_df, wine_features, knn, user_item_matrix):
    user_idx = user_item_matrix.index.get_loc(user_data['유저아이디'])
    distances, indices = knn.kneighbors([user_item_matrix.iloc[user_idx].values], n_neighbors=5)
    recommended_drinks = []
    for idx in indices.flatten():
        recommended_drinks.extend(user_item_matrix.iloc[idx].nlargest(3).index.tolist())
    return list(set(recommended_drinks))[:5]  # 중복 제거 후 상위 5개 반환

def evaluate_recommendations(actual, predicted, k=5):
    def dcg_at_k(r, k):
        r = np.asfarray(r)[:k]
        return np.sum(r / np.log2(np.arange(2, r.size + 2)))

    def ndcg_at_k(r, k):
        dcg_max = dcg_at_k(sorted(r, reverse=True), k)
        if not dcg_max:
            return 0.
        return dcg_at_k(r, k) / dcg_max

    scores = []
    for act, pred in zip(actual, predicted):
        r = [1 if p in act else 0 for p in pred]
        scores.append(ndcg_at_k(r, k))
    
    return np.mean(scores)

def evaluate_recommendation_system():
    print("데이터 로딩 중...")
    usr_info_df, wine_info_df = load_data()
    
    print("데이터 전처리 중...")
    tfidf_vectorizer, wine_features, knn, user_item_matrix, wine_info_df = preprocess_data(usr_info_df, wine_info_df)

    print("데이터 분할 중...")
    train_data, test_data = train_test_split(usr_info_df, test_size=0.2, random_state=42)

    print("추천 생성 및 평가 중...")
    actual = test_data['좋아하는주류이름'].tolist()
    predictions = []
    for _, user in test_data.iterrows():
        recommendations = get_recommendations_for_user(user, wine_info_df, wine_features, knn, user_item_matrix)
        predictions.append(recommendations)

    precision = np.mean([len(set(a) & set(p)) / len(p) if p else 0 for a, p in zip(actual, predictions)])
    recall = np.mean([len(set(a) & set(p)) / len(a) if a else 0 for a, p in zip(actual, predictions)])
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    ndcg = evaluate_recommendations(actual, predictions)

    print("\n=== 성능 평가 결과 ===")
    print(f"Precision@5: {precision:.4f}")
    print(f"Recall@5: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print(f"NDCG@5: {ndcg:.4f}")

if __name__ == "__main__":
    evaluate_recommendation_system()