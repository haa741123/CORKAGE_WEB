import tensorflow as tf

# 모델 로드
model = tf.keras.models.load_model('wine_recommendation_model.h5')

def predict_rating(user_preferences):
    input_data = [user_preferences]  # 예시로 단일 사용자의 선호도를 사용
    predictions = model.predict(input_data)
    
    # 상위 5개 추천 결과 반환 (여기서는 간단한 예시)
    recommendations = predictions[0].argsort()[-5:][::-1]
    return recommendations.tolist()
