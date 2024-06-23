from flask import Blueprint, request, jsonify
from recommendation import predict_rating

recommendation_routes = Blueprint('recommendation_routes', __name__)

@recommendation_routes.route('/recommend', methods=['POST'])
def recommend():
    data = request.json
    user_preferences = data['preferences']
    
    recommendations = predict_rating(user_preferences)
    return jsonify(recommendations)
