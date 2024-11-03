import logging
from flask import Blueprint, request, render_template, jsonify
import requests
from supabase import create_client

SearchController = Blueprint('search', __name__)

SUPABASE_URL = "https://kovzqlclzpduuxejjxwf.supabase.co"
SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ"
supabase = create_client(SUPABASE_URL, SUPABASE_API_KEY)

@SearchController.route('/search/<string:search_term>')
def search_results(search_term):
    try:
        # 'corkage' 테이블에서 음식점 데이터를 조회
        response = supabase.table('corkage').select('*').ilike('name', f'%{search_term}%').execute()
        
        # 데이터가 성공적으로 조회되었는지 확인
        if response.data:
            restaurant_data = response.data  # 응답에서 데이터를 직접 접근
        else:
            restaurant_data = []
            logging.error("Supabase 요청 실패, 반환된 데이터가 없습니다.")
        
        # 기능 추천 (선택 사항, 필요 시 별도의 테이블에 저장 가능)
        feature_recommendations = [
            {"feature_name": "예약 기능", "description": "음식점 예약 기능을 제공합니다."},
            {"feature_name": "리뷰 작성", "description": "이용자 리뷰를 남길 수 있습니다."}
        ]

        # JSON 응답 반환
        return jsonify({
            "restaurant_data": restaurant_data,
            "feature_recommendations": feature_recommendations
        })

    except Exception as e:
        logging.error(f"Supabase에서 데이터 조회 중 오류 발생: {e}")
        return jsonify({"error": "데이터 조회에 실패했습니다"}), 500
