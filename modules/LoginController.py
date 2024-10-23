from flask import Blueprint, request, jsonify, redirect, make_response, render_template
import requests
import jwt
from datetime import datetime, timedelta, timezone
from supabase import create_client

# LoginController 블루프린트 설정
LoginController = Blueprint('LoginController', __name__)

# Supabase 초기화
SUPABASE_URL = 'https://kovzqlclzpduuxejjxwf.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ'
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# JWT 시크릿 키
SECRET_KEY = 'AbMyTfPj/w869Xe6nGn7Mf+EyCAH0dS+SfCboVjjGJbeg3DVASFl1iU6TL9AEBTS6AKoY0Ewij0QP2GA2d+Jng=='

# 카카오 API 정보
REST_API_KEY = '6b5cc3ff382b0cb3ea15795729b3329f'
CLIENT_SECRET = 'S9WK77WOT8w1l4p6sn4leDk2FSs1hppB'
REDIRECT_URI = 'http://127.0.0.1:5000/auth/kakao/callback'

# JWT 토큰 생성 함수
def create_jwt(user_id):
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)
    token = jwt.encode({'id': user_id, 'exp': expiration}, SECRET_KEY, algorithm='HS256')
    return token

# 카카오 사용자 정보 가져오기 함수
def get_kakao_user_info(access_token):
    user_info_url = 'https://kapi.kakao.com/v2/user/me'
    headers = {'Authorization': f'Bearer {access_token}'}
    try:
        user_info = requests.get(user_info_url, headers=headers).json()
        return user_info
    except Exception as e:
        print(f"카카오 사용자 정보 가져오기 오류: {e}")
        return None

# 카카오 콜백 처리
@LoginController.route('/callback')
def kakao_callback():
    try:
        code = request.args.get('code')

        # 카카오에서 Access Token 발급
        token_url = 'https://kauth.kakao.com/oauth/token'
        headers = {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
        data = {
            'grant_type': 'authorization_code',
            'client_id': REST_API_KEY,
            'redirect_uri': REDIRECT_URI,
            'code': code,
            'client_secret': CLIENT_SECRET
        }
        token_response = requests.post(token_url, headers=headers, data=data).json()

        # Access Token 발급 실패 시 처리
        if 'error' in token_response:
            return render_template('html/error.html', error_message=f"Access token 오류: {token_response.get('error_description', '알 수 없는 오류')}"), 400

        access_token = token_response.get('access_token')

        # 사용자 정보 가져오기
        user_info = get_kakao_user_info(access_token)
        if not user_info:
            return render_template('html/error.html', error_message="유저 정보를 받지 못했습니다."), 400

        kakao_id = user_info.get('id')
        kakao_email = user_info['kakao_account'].get('email')

        if not kakao_id or not kakao_email:
            return jsonify({'error': "필수 유저 정보를 카카오로부터 가져오지 못했습니다."}), 400

        # Supabase에서 유저 정보 확인
        user_check = supabase.table('users').select('*').eq('id', kakao_id).execute()

        if len(user_check.data) == 0:
            return render_template('html/signup.html', email=kakao_email, kakao_id=kakao_id)
        else:
            # 유저가 존재하면 자동 로그인 처리
            jwt_token = create_jwt(kakao_id)
            response = make_response(redirect('/auth/kakao/main_jwt'))

            response.set_cookie('accessToken', jwt_token, httponly=True, secure=True)
            return response

    except Exception as e:
        return render_template('html/error.html', error_message=f"에러가 발생했습니다: {str(e)}"), 500



# 회원가입 API
@LoginController.route('/signup')
def signup():
    data = request.get_json()
    email = data['email']
    nickname = data['nickname']
    kakao_id = data['kakao_id']

    # 닉네임 중복 확인
    nickname_check = supabase.table('users').select('*').eq('nickname', nickname).execute()
    if len(nickname_check.data) > 0:
        return jsonify({'success': False, 'message': '이미 사용 중인 닉네임입니다.'}), 400

    # 신규 회원 추가
    supabase.table('users').insert({
        'id': kakao_id,
        'email': email,
        'nickname': nickname,
        'registered_at': datetime.now().isoformat()
    }).execute()

    # 자동 로그인 처리 (토큰 발급)
    jwt_token = create_jwt(kakao_id)
    response = jsonify({'success': True, 'accessToken': jwt_token})
    response.set_cookie('accessToken', jwt_token, httponly=True, secure=True)
    return response




@LoginController.route('/main_jwt')
def main():
    token = request.cookies.get('accessToken')
    
    if not token:
        return redirect('/login')
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['id']
        user_data = supabase.table('users').select('*').eq('id', user_id).execute()

        if user_data.data:
            nickname = user_data.data[0]['nickname']
            print(nickname)
            return render_template('html/main.html', nickname=nickname)
        else:
            return jsonify({'error': 'User not found'}), 404
    except jwt.ExpiredSignatureError:
        return redirect('/login')
    except jwt.InvalidTokenError:
        return redirect('/login')

