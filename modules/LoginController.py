from flask import Blueprint, request, jsonify, redirect
import requests

LoginController = Blueprint('LoginController', __name__)

# 카카오 API 설정
REST_API_KEY = '6b5cc3ff382b0cb3ea15795729b3329f'  # 카카오에서 발급받은 REST API 키
REDIRECT_URI = 'https://corkage.store/login_test'
CLIENT_SECRET = 'S9WK77WOT8w1l4p6sn4leDk2FSs1hppB'  # 필요 시

@LoginController.route('/login_test')
def login_test():
    code = request.args.get('code')  # 카카오에서 전달된 인가 코드
    if not code:
        return "인가 코드를 찾을 수 없습니다.", 400

    # 인가 코드를 사용해 액세스 토큰 요청
    token_url = "https://kauth.kakao.com/oauth/token"
    data = {
        'grant_type': 'authorization_code',
        'client_id': REST_API_KEY,
        'redirect_uri': REDIRECT_URI,
        'code': code,
        'client_secret': CLIENT_SECRET  # 필요 시 사용
    }

    response = requests.post(token_url, data=data)
    token_data = response.json()

    # 액세스 토큰이 성공적으로 발급되었는지 확인
    if 'access_token' in token_data:
        access_token = token_data['access_token']

        # 액세스 토큰을 사용해 사용자 정보 요청
        user_info_url = "https://kapi.kakao.com/v2/user/me"
        headers = {'Authorization': f'Bearer {access_token}'}
        user_response = requests.get(user_info_url, headers=headers)
        user_info = user_response.json()

        return jsonify(user_info)  # 사용자 정보 반환

    else:
        return jsonify(token_data), 400

# 로그아웃 기능 추가 예시 (필요 시)
@LoginController.route('/logout')
def logout():
    # 로컬에서 세션이나 쿠키 정보를 지우는 방식으로 로그아웃 처리
    return "로그아웃 되었습니다."
