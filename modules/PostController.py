# PostController.py (게시물 작성 및 수정)

from flask import Blueprint, request, jsonify
from DBController import create_connection
from mysql.connector import Error

PostController = Blueprint('PostController', __name__)

@PostController.route('/SetPost', methods=['POST'])
def set_post():
    data = request.json
    print(data)  # 받은 파라미터
    
    # 처리 타입
    proc_typ = 'Set_Post'
    
    # 타입 지정
    try:
        title = str(data.get('title', ''))
        content = str(data.get('content', ''))
    except ValueError as e:
        print(f"타입 변환 오류: {e}")
        title = ""
        content = ""
    
    # DB 커넥터 연결
    connection = create_connection()
    if connection is None:
        return jsonify({"response": {"message": "DB 연결 문제 발생함"}}), 500                  # 개발 단계
        # return jsonify({"response": {"message": "일시적인 문제가 발생했습니다."}}), 500       # 배포 단계
    
    try:
        cursor = connection.cursor()
        params = [
            proc_typ,   # 처리 타입
            title,      # 게시물 제목
            content     # 게시물 내용
        ]
        
        cursor.callproc('InsertPost', params)
        connection.commit()
        response = {"rslt": "0"}
    except Error as e:
        print(f"데이터베이스 오류: '{e}'")
        response = {"message": "게시물 생성에 문제가 발생했습니다."}
    finally:
        cursor.close()
        connection.close()

    return jsonify({"response": response})
