from flask import Flask, Blueprint, request, jsonify
import mysql.connector
from mysql.connector import Error
import os

app = Flask(__name__)
PostController = Blueprint('PostController', __name__)

# MySQL 연결 설정
def create_connection():
    connection = None
    try:
        db_config = {
            "host": os.environ['DB_HOST'],
            "user": os.environ['DB_USER'],
            "password": os.environ['DB_PASSWORD'],
            "database": os.environ['DB_NAME']
        }

        connection = mysql.connector.connect(
            host=db_config['host'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database']
        )
        
        if connection.is_connected():
            print("MySQL Database connection successful")
    except Error as e:
        print(f"The error '{e}' occurred")
    except KeyError as e:
        print(f"Environment variable not set: {e}")
        
    return connection

@PostController.route('/SetPost', methods=['POST'])
def set_post():
    data = request.json
    print(data)  # 받은 데이터 출력 (테스트용)
    
    connection = create_connection()
    if connection is None:
        response = {"message": "일시적인 문제가 발생했습니다."}
        return jsonify({"response": response}), 500
    
    cursor = connection.cursor()

    # SQL 쿼리 작성
    query = "INSERT INTO posts (title, content) VALUES (%s, %s)"
    values = (data['title'], data['content'])
    
    try:
        cursor.execute(query, values)
        connection.commit()
        response = {"message": "Post added successfully"}
    except Error as e:
        print(f"The error '{e}' occurred")
        response = {"message": "Failed to add post"}
    
    cursor.close()
    connection.close()

    return jsonify({"response": response})

