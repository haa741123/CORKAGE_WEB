import os
from dotenv import load_dotenv
from supabase import create_client
from flask import jsonify, Blueprint, request
import hashlib

# 블루프린트 생성
supabaseController = Blueprint('supabaseController', __name__)

# 환경 변수 로드
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Supabase 클라이언트 생성
supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

#--------------------------------------------------------------------------------------
# 메인 페이지 관련 API
@supabaseController.route('/main_page', methods=['POST'])
def get_restaurants():
    list_type = request.form.get('type')
    data = None  # 기본적으로 데이터를 None으로 설정
    error_message = None  # 에러 메시지를 None으로 설정

    try:
        # 인기 맛집 리스트 조회
        if list_type == 'popular':
            response = supabase_client.table('corkage') \
                .select('rating, id, coordinates, phone, address, category_name, image_url, description, tags, name') \
                .order('rating', desc=True) \
                .limit(10) \
                .execute()
            data = response.data  # 데이터 할당
        
        # 유저들의 BEST픽 조회
        elif list_type == 'best':
            response = supabase_client.table('corkage') \
                .select('rating, id, coordinates, phone, address, category_name, image_url, description, tags, name') \
                .order('rating', desc=True) \
                .limit(10) \
                .execute()
            data = response.data  # 데이터 할당

        # 데이터가 유효한지 확인
        if data:
            return jsonify({'data': data}), 200
    
    except Exception as e:
        # 예외 발생 시 상세 메시지 출력
        return jsonify({'error': f"예기치 않은 오류 발생: {str(e)}"}), 500

#--------------------------------------------------------------------------------------

# 북마크 레스토랑 개수 
@supabaseController.route('/restaurant_count', methods=['POST'])
def restaurant_count():
    try:
        # RPC 쿼리를 사용하여 총 레스토랑 개수 가져오기
        response = supabase_client.rpc('get_corkage_bookmarks').execute()
        count = len(response.data) if response.data else 0
        return jsonify({'count': count}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# 북마크 음식점 페이징
@supabaseController.route('/paged_restaurants', methods=['POST'])
def fetch_paged_restaurants():
    data = request.get_json()
    end_limit = data.get('end_limit')
    start = data.get('start')

    try:
        # RPC 쿼리를 사용하여 페이지별 레스토랑 데이터 가져오기
        response = supabase_client.rpc('fetch_paged_restaurants', {
            'end_limit': end_limit,
            'start': start
        }).execute()

        # 데이터를 반환
        if response.data:
            return jsonify({'restaurants': response.data}), 200
        else:
            return jsonify({'restaurants': []}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# 북마크 해지
@supabaseController.route('/remove_bookmark', methods=['POST'])
def remove_bookmark():
    data = request.get_json()
    restaurant_id = data.get('restaurant_id')

    if not restaurant_id:
        return jsonify({'error': '레스토랑 ID가 필요합니다.'}), 400

    try:
        # Supabase에서 북마크 상태를 업데이트
        supabase_client.table('bookmark') \
            .update({'status': False}) \
            .eq('restaurant_id', restaurant_id) \
            .execute()

        return jsonify({'message': '북마크가 해지되었습니다.'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

# 북마크 메모 업데이트
@supabaseController.route('/update_memo', methods=['POST'])
def update_memo():
    data = request.get_json()
    restaurant_id = data.get('restaurant_id')
    memo = data.get('memo')

    if not restaurant_id or memo is None:
        return jsonify({'error': '레스토랑 ID와 메모 내용이 필요합니다.'}), 400

    try:
        # Supabase에서 memo 컬럼 업데이트
        supabase_client.table('bookmark') \
            .update({'memo': memo}) \
            .eq('restaurant_id', restaurant_id) \
            .execute()

        return jsonify({'message': '메모가 업데이트되었습니다.'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

#--------------------------------------------------------------------------------------
# 사장님 로그인 관련 API

def hash_password(password):
    """비밀번호 해싱 함수 (SHA-256 사용)"""
    return hashlib.sha256(password.encode()).hexdigest()

@supabaseController.route('/api/v1/owner_login', methods=['POST'])
def owner_login():
    data = request.get_json()
    login_id = data.get('login_id')
    login_passwd = data.get('login_passwd')  # 클라이언트에서 이미 해싱된 비밀번호가 전송됨

    if not login_id or not login_passwd:
        return jsonify({'error': '로그인 ID와 비밀번호가 필요합니다.'}), 400

    try:
        # Supabase에서 사용자 정보 조회
        response = supabase_client.table("owner").select("*").eq("login_id", login_id).execute()
        
        if not response.data:
            error_message = '사용자 정보가 존재하지 않습니다.'
            return jsonify({'error': error_message}), 404

        owner_data = response.data[0]

        # 해싱된 비밀번호 확인 (클라이언트와 서버가 같은 해싱 알고리즘 사용)
        if owner_data["login_passwd"] != login_passwd:
            return jsonify({'error': '비밀번호가 일치하지 않습니다.'}), 401

        # 로그인 성공 시 사용자 데이터 반환
        return jsonify({'ownerData': owner_data}), 200

    except Exception as e:
        return jsonify({'error': '로그인 처리 중 오류가 발생했습니다.'}), 500
    
    

#--------------------------------------------------------------------------------------  
# (검색 화면)인기 맛집 데이터 관련 API  
@supabaseController.route('/popular_restaurants', methods=['POST'])
def fetch_popular_restaurants():
    data = request.get_json()
    limit = data.get('limit', 10)  # 기본값 10으로 설정

    try:
        # Supabase에서 인기 맛집 데이터 조회
        response = supabase_client.table('corkage') \
            .select('rating, id, coordinates, phone, address, category_name, image_url, description, tags, name') \
            .order('rating', desc=True) \
            .limit(limit) \
            .execute()
        
        # 데이터를 반환
        return jsonify({'restaurants': response.data}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500    
    


#--------------------------------------------------------------------------------------  
# (사장님 화면) 예약 정보를 가져오는 API
@supabaseController.route('/get_Reservations', methods=['POST'])
def get_Reservations():
    from flask import request, jsonify
    import datetime

    try:
        # 요청 데이터 받기
        data = request.json
        page = data.get("page", 1)
        items_per_page = data.get("itemsPerPage", 6)
        start_date = data.get("startDate", None)
        end_date = data.get("endDate", None)

        # 페이지네이션을 위한 범위 설정
        offset = (page - 1) * items_per_page
        limit = items_per_page

        # 날짜 필터링 기본값 (지난 30일)
        if not start_date or not end_date:
            thirty_days_ago = (datetime.datetime.now() - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
            start_date = thirty_days_ago

        # Supabase 쿼리 생성
        query = supabase_client.table("reservations") \
            .select("id, reservation_date, reservation_time, people_count, created_at", count="exact") \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1)

        # 날짜 필터링 추가
        if start_date:
            query = query.gte("reservation_date", start_date)
        if end_date:
            query = query.lte("reservation_date", end_date)

        # 쿼리 실행
        response = query.execute()
        data = response.data
        count = response.count

        return jsonify({"data": data, "count": count})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500



#--------------------------------------------------------------------------------------  
# (음식점 세부 화면) Supabase에서 음식점 정보를 가져오는 함수
@supabaseController.route('/get_Restaurant_Info', methods=['POST'])
def get_restaurant_info():
    from flask import request, jsonify

    try:
        # 요청에서 음식점 ID를 가져옴
        data = request.json
        restaurant_id = data.get("id")
        if not restaurant_id:
            return jsonify({"error": "음식점 ID가 제공되지 않았습니다."}), 400

        # Supabase 쿼리를 통해 음식점 정보 조회
        response = supabase_client.table("corkage") \
            .select("id, name, phone, address, description, rating, coordinates") \
            .eq("id", restaurant_id) \
            .single() \
            .execute()

        return jsonify({"data": response.data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 예약 insert
@supabaseController.route('/insert_Reservation', methods=['POST'])
def insert_reservation():
    from flask import request, jsonify

    try:
        # 클라이언트에서 보낸 데이터 가져오기
        data = request.json
        reservation_date = data.get("reservation_date")
        reservation_time = data.get("reservation_time")
        people_count = data.get("people_count")

        # 필수 필드가 누락되었는지 확인
        if not (reservation_date and reservation_time and people_count):
            return jsonify({"error": "모든 필수 정보가 제공되지 않았습니다."}), 400

        # Supabase에 데이터 삽입
        response = supabase_client.table("reservations").insert([
            {
                "reservation_date": reservation_date,
                "reservation_time": reservation_time,
                "people_count": people_count
            }
        ]).execute()

        return jsonify({"message": "예약이 성공적으로 추가되었습니다.", "data": response.data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#--------------------------------------------------------------------------------------  
# (지도 화면) 음식점 리스트
@supabaseController.route('/get_Nearest_Restaurants', methods=['POST'])
def get_nearest_restaurants():
    from flask import request, jsonify

    try:
        # 클라이언트에서 보낸 데이터 가져오기
        data = request.json
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        limit_count = data.get("limit_count", 30)

        # 필수 필드가 누락되었는지 확인
        if latitude is None or longitude is None:
            return jsonify({"error": "위도와 경도가 제공되지 않았습니다."}), 400

        # Supabase에서 저장 프로시저 호출
        response = supabase_client.rpc("get_nearest_restaurants", {
            "user_lat": latitude,
            "user_lon": longitude,
            "limit_count": limit_count
        }).execute()

        data = response.data
        if not data:
            return jsonify({"data": [], "message": "데이터가 없습니다."}), 200

        # 데이터 가공
        restaurants = [
            {
                "id": item.get("id"),
                "place_name": item.get("name", ""),
                "road_address_name": item.get("address", ""),
                "phone": item.get("phone", ""),
                "image_url": item.get("image_url", "/static/img/res_sample_img.jpg"),
                "category_name": item.get("category_name", ""),
                "tags": item.get("tags", "").replace("{", "").replace("}", "").replace('"', '').split(",") if item.get("tags") else [],
                "x": item.get("x", ""),
                "y": item.get("y", ""),
                "distance": item.get("distance", ""),
                "price": item.get("price", ""),
                "description": item.get("description", "")
            }
            for item in data
        ]

        return jsonify({"data": restaurants})

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# 북마크 업데이트
@supabaseController.route('/update_Bookmark_Status', methods=['POST'])
def update_bookmark_status():
    from flask import request, jsonify

    try:
        # 클라이언트에서 보낸 데이터 가져오기
        data = request.json
        restaurant_id = data.get("restaurant_id")
        status = data.get("status", False)

        # 필수 필드가 누락되었는지 확인
        if not restaurant_id:
            return jsonify({"error": "음식점 ID가 제공되지 않았습니다."}), 400

        # Supabase 테이블 업데이트 쿼리
        response = supabase_client.table("bookmark").update({
            "status": status
        }).eq("restaurant_id", restaurant_id).execute()

        return jsonify({"message": "북마크 상태가 업데이트되었습니다.", "data": response.data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

