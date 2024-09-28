from flask import Blueprint, render_template, request, jsonify, current_app
import os
from werkzeug.utils import secure_filename
import logging

main_routes = Blueprint('main_routes', __name__)

# 각 라우트에 대한 설명
@main_routes.route("/login")
def login():
    return render_template('html/login.html')  # 로그인 화면 페이지

@main_routes.route("/")
def home():
    return render_template('html/index.html')  # 홈화면

@main_routes.route("/sch_filter")
def sch_filter():
    return render_template('html/sch_filter.html')  # 필터 페이지

@main_routes.route("/chatbot")
def chatbot():
    return render_template('html/chat.html')  # 챗봇 페이지

@main_routes.route("/post")
def post():
    return render_template('html/Posts.html')  # 게시물 페이지

@main_routes.route("/edit_post")
def edit_post():
    return render_template('html/edit_post.html')  # 게시물 작성 및 수정

@main_routes.route("/restaurant")
def restaurant():
    return render_template('html/restaurant.html')  # 음식점 페이지

@main_routes.route("/mypage")
def mypage():
    return render_template('html/mypage.html')  # 마이페이지

@main_routes.route("/drink_info")
def drink_info():
    return render_template('html/drink_info.html')  # 와인 정보 페이지

@main_routes.route("/reservation_owner")
def reservatation_owner():
    return render_template('html/reservation_owner.html')  # 예약 정보 페이지

@main_routes.route("/main")
def main():
    return render_template('html/main.html')  # 메인 페이지



# 허용된 파일 확장자 정의
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

# 파일 확장자 검사 함수
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 파일 업로드 처리 라우트
@main_routes.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            upload_folder = current_app.config['UPLOAD_FOLDER']
            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)
            file_path = os.path.join(upload_folder, filename)
            file.save(file_path)
            current_app.logger.info(f"File saved successfully: {file_path}")
            return jsonify({'message': 'File uploaded successfully'}), 200
        return jsonify({'error': 'File type not allowed'}), 400
    except Exception as e:
        current_app.logger.error(f"Error in file upload: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# 404 에러 처리
@main_routes.errorhandler(404)
def page_not_found(e):
    return render_template('html/error.html'), 404

# 주요 설명:
# 1. 여러 페이지에 대한 라우트를 정의합니다.
# 2. 파일 업로드 기능을 구현하고, 허용된 파일 형식을 검사합니다.
# 3. 파일 업로드 시 발생할 수 있는 예외를 처리합니다.
# 4. 404 에러 페이지를 정의합니다.