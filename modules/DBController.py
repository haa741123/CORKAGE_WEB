# DBController.py (프로시저 연결)

import mysql.connector
from mysql.connector import Error
import os

def create_connection():
    try:
        # 환경 변수에서 DB 연결 문자열 가져오기
        DB_ENV = os.environ['DB_ENV']
        
        # 환경 변수 값을 파싱
        connection_info = dict(item.split("=") for item in DB_ENV.split(";"))
        
        connection = mysql.connector.connect(
            host=connection_info['host'],
            user=connection_info['user'],
            password=connection_info['password'],
            database=connection_info['database']
        )
        
        if connection.is_connected():
            print("MySQL 연결 성공")
            return connection
    except Error as e:
        print(f"문제: '{e}'")
    except KeyError as e:
        print(f"환경변수 문제: {e}")
    
    return None
