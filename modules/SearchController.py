import logging
from flask import Blueprint, request, render_template, jsonify
import requests
from supabase import create_client
from dotenv import load_dotenv
import os

SearchController = Blueprint('SearchController', __name__)

# 환경 변수 로드
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Supabase 클라이언트 생성
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


@SearchController.route('/search/<string:search_term>')
def search_results(search_term):
    try:
        user_id = request.cookies.get('user_id')

        if not user_id:
            return jsonify({"error": "유저 아이디가 존재하지 않습니다."}), 401

        # 'corkage' 테이블에서 음식점 데이터를 조회
        response = supabase.table('corkage').select('*').ilike('name', f'%{search_term}%').execute()
        
        # 데이터가 성공적으로 조회되었는지 확인
        if response.data:
            restaurant_data = response.data  # 응답에서 데이터를 직접 접근
        else:
            restaurant_data = []
            logging.error("Supabase 요청 실패, 반환된 데이터가 없습니다.")

        # 검색어 저장
        save_search_term(user_id, search_term)
        
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


# 검색어 저장 함수
def save_search_term(user_id, search_term):
    try:
        response = supabase.table('sch_word').select('*').eq('user_id', user_id).eq('term', search_term).execute()
        
        if response.data:
            record_id = response.data[0]['id']
            supabase.table('sch_word').update({"count": response.data[0]['count'] + 1}).eq('id', record_id).execute()
        else:
            supabase.table('sch_word').insert({"user_id": user_id, "term": search_term, "count": 1}).execute()
    except Exception as e:
        logging.error(f"검색어 저장 실패: {e}")


@SearchController.route('/recent_searches', methods=['POST'])
def recent_searches():
    user_id = request.cookies.get('user_id')  # 쿠키에서 user_id를 가져옴
    
    if not user_id:
        return jsonify([])  # user_id가 없으면 빈 배열 반환
    else:
        print(user_id)

    # Supabase에서 최근 검색어 데이터 가져오기
    response = supabase.table('sch_word') \
                       .select('term') \
                       .eq('user_id', user_id) \
                       .order('created_at') \
                       .limit(10) \
                       .execute()

    if response:
        searches = response.data
    else:
        searches = []

    return jsonify(searches)


# 인기 검색어를 가져오는 함수
@SearchController.route('/popular_sch_terms')
def popular_search_terms():
    try:
        # 검색 횟수가 높은 순으로 상위 10개 검색어를 가져옵니다.
        response = supabase.table('sch_word').select('term, count').order('count', desc=True).limit(10).execute()

        if response.data:
            popular_terms = response.data
        else:
            popular_terms = []
            logging.error("Supabase 요청 실패, 인기 검색어 데이터가 없습니다.")

        return jsonify({
            "popular_search_terms": popular_terms
        })

    except Exception as e:
        logging.error(f"인기 검색어 조회 중 오류 발생: {e}")
        return jsonify({"error": "인기 검색어 조회에 실패했습니다"}), 500