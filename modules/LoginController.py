from flask import Blueprint, request, jsonify, make_response, render_template, redirect, flash
import jwt
import requests
from datetime import datetime, timedelta, timezone
import logging
from supabase import create_client
from urllib.parse import quote
from dotenv import load_dotenv
import os
from flask import jsonify, redirect

LoginController = Blueprint('LoginController', __name__)

# 환경 변수 로드
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")    # JWT 시크릿 키

# 카카오 API 정보
REST_API_KEY = os.getenv("REST_API_KEY")    
CLIENT_SECRET = os.getenv("CLIENT_SECRET")    
REDIRECT_URI = os.getenv("REDIRECT_URI")


# Supabase 클라이언트 생성
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# 로그 설정
logging.basicConfig(level=logging.INFO)

# JWT 토큰 생성 함수 - 만료 시간 무제한 설정
def create_jwt(user_id):
    try:
        # 만료 시간을 설정하지 않음으로써 무기한 유효한 토큰 발급
        expiration = datetime.now(timezone.utc) + timedelta(minutes=30)
        token = jwt.encode({'id': user_id, 'exp': expiration}, SECRET_KEY, algorithm='HS256')
        return token
    except Exception as e:
        logging.error(f"JWT 토큰 생성 오류: {e}")
        return None


# 카카오 사용자 정보 가져오기 함수
def get_kakao_user_info(access_token):
    user_info_url = 'https://kapi.kakao.com/v2/user/me'
    headers = {'Authorization': f'Bearer {access_token}'}
    try:
        response = requests.get(user_info_url, headers=headers)
        response.raise_for_status()  # HTTP 에러 발생 시 예외 처리
        return response.json()
    except requests.RequestException as e:
        logging.error(f"카카오 사용자 정보 가져오기 오류: {e}")
        return None

# 카카오 콜백 처리
@LoginController.route('/callback')
def kakao_callback():
    try:
        code = request.args.get('code')
        if not code:
            flash("로그인 도중 문제가 발생했습니다.", 'error')
            return redirect('/login')

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
            flash(f"Access token 오류: {token_response.get('error_description', '알 수 없는 오류')}", 'error')
            return redirect('/login')

        access_token = token_response.get('access_token')

        # 사용자 정보 가져오기
        user_info = get_kakao_user_info(access_token)
        if not user_info:
            flash("로그인 도중 문제가 발생했습니다.", 'error')
            return redirect('/login')

        kakao_id = user_info.get('id')
        kakao_email = user_info.get('kakao_account', {}).get('email')

        if not kakao_id or not kakao_email:
            flash("필수 유저 정보를 가져오지 못했습니다.", 'error')
            return redirect('/login')

        # Supabase에서 유저 정보 확인
        user_data = supabase.table('users').select('*').eq('id', kakao_id).execute()

        if not user_data.data:
            return render_template('html/signup.html', email=kakao_email, kakao_id=kakao_id)

        nickname = user_data.data[0]['nickname']

        # 유저가 존재하면 자동 로그인 처리
        jwt_token = create_jwt(kakao_id)
        if not jwt_token:
            flash("토큰 생성 실패", 'error')
            return redirect('/login')
        
        # 로그인 성공 시 토큰과 유저 아이디를 함께 응답
        return jsonify({
            "status": "success",
            "message": "로그인 성공",
            "token": jwt_token,     # 토큰값
            "user_id": kakao_id,    # 유저 아이디
            "nickname": nickname    # 유저 닉네임
        }), 200
    
    except Exception as e:
        logging.error(f"로그인 처리 중 에러 발생: {e}")
        flash("로그인 도중 문제가 발생했습니다.", 'error')
        return redirect('/login')
    
    
# 메인 로그인 처리
@LoginController.route('/main_jwt')
def main():
    token = request.cookies.get('accessToken')

    if not token:
        flash("로그인이 필요합니다.", 'error')
        return redirect('/login')

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['id']
        user_data = supabase.table('users').select('*').eq('id', user_id).execute()

        if user_data.data:
            nickname = user_data.data[0]['nickname']
            return render_template('html/main.html', nickname=nickname)
        else:
            flash("유저 정보를 찾을 수 없습니다.", 'error')
            return redirect('/login')
    except jwt.ExpiredSignatureError:
        flash("로그인 세션이 만료되었습니다.", 'error')
        return redirect('/login')
    except jwt.InvalidTokenError:
        flash("유효하지 않은 로그인 세션입니다.", 'error')
        return redirect('/login')
    

# 회원가입 API
@LoginController.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        email = data.get('email')
        nickname = data.get('nickname')
        kakao_id = data.get('kakao_id')

        if not (email and nickname and kakao_id):
            flash("회원가입 중 문제가 발생했습니다.", 'error')
            return redirect('/login')

        # 닉네임 중복 확인
        nickname_check = supabase.table('users').select('*').eq('nickname', nickname).execute()
        if len(nickname_check.data) > 0:
            flash('이미 사용 중인 닉네임입니다.', 'error')
            return redirect('/login')

        # 신규 회원 추가
        supabase.table('users').insert({
            'id': kakao_id,
            'email': email,
            'nickname': nickname,
            'registered_at': datetime.now().isoformat()
        }).execute()

        # 자동 로그인 처리 (토큰 발급)
        jwt_token = create_jwt(kakao_id)
        if not jwt_token:
            flash("토큰 생성 실패", 'error')
            return redirect('/login')

        response = jsonify({'success': True, 'accessToken': jwt_token})
        response.set_cookie('accessToken', jwt_token, httponly=True, secure=True)
        return response

    except Exception as e:
        logging.error(f"회원가입 처리 중 에러 발생: {e}")
        flash("회원가입 중 문제가 발생했습니다.", 'error')
        return redirect('/login')


# 닉네임 변경 API
@LoginController.route('/ch_nickname', methods=['POST'])
def ch_nickname():
    try:
        # JWT 토큰으로부터 사용자 ID 가져오기
        userid = request.cookies.get('user_id')
        if not userid:
            flash("로그인이 필요합니다.", 'error')
            return redirect('/login')
        
        # 요청으로부터 새 닉네임 가져오기
        data = request.get_json()
        new_nickname = data.get('nickname')
        
        if not new_nickname:
            flash("닉네임을 입력해주세요.", 'error')
            return jsonify({'success': False, 'message': "닉네임을 입력해주세요."}), 400

        # 닉네임 중복 확인
        nickname_check = supabase.table('users').select('*').eq('nickname', new_nickname).execute()
        if len(nickname_check.data) > 0:
            flash('이미 사용 중인 닉네임입니다.', 'error')
            return jsonify({'success': False, 'message': "이미 사용 중인 닉네임입니다."}), 400

        # 닉네임 변경
        supabase.table('users').update({'nickname': new_nickname}).eq('id', userid).execute()
        flash("닉네임이 성공적으로 변경되었습니다.", 'success')
        
        return jsonify({'success': True, 'message': "닉네임이 변경되었습니다."})
    
    except Exception as e:
        logging.error(f"닉네임 변경 중 오류 발생: {e}")
        flash("닉네임 변경 중 문제가 발생했습니다.", 'error')
        return jsonify({'success': False, 'message': "닉네임 변경 중 문제가 발생했습니다."}), 500



# 로그아웃 처리
@LoginController.route('/logout')
def logout():
    try:
        response = make_response(redirect('/login'))
        response.delete_cookie('accessToken')  # JWT 토큰 쿠키 삭제
        flash("로그아웃이 완료되었습니다.", 'success')  # 성공 메시지 추가
        return response
    except Exception as e:
        logging.error(f"로그아웃 처리 중 에러 발생: {e}")
        flash("로그아웃 처리 중 문제가 발생했습니다.", 'error')
        return redirect('/main_jwt')
