from flask import Flask, request, redirect, make_response
import requests
from flask_cors import CORS
from routes.main_routes import main_routes
from datetime import timedelta
import logging

app = Flask(__name__)
CORS(app)  # CORS 설정 추가
app.config['UPLOAD_FOLDER'] = '/home/hamin/flask/images'  # 실제 업로드 폴더 경로로 변경해야 합니다
app.config['SECRET_KEY'] = 'your_secret_key_here'  # 안전한 비밀 키로 변경하세요
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)
app.config['JSON_AS_ASCII'] = False



# 페이지 경로
app.register_blueprint(main_routes)

# 주류 추천 (문제 발생 시 서버 전체 영향 방지)
try:
    from modules.RecommendController import RecommendController
    app.register_blueprint(RecommendController, url_prefix='/api/v1')  # 주류 추천
except ImportError as e:
    logging.error(f"RecommendController 모듈 임포트 중 오류 발생: {e}")
except Exception as e:
    logging.error(f"RecommendController 블루프린트 등록 중 오류 발생: {e}")

# 주류사진 분석 로드 시도
try:
    from modules.WineDetectionController import WineDetectionController
    app.register_blueprint(WineDetectionController, url_prefix='/api/v1')  # 사진 분석
except ImportError as e:
    logging.error(f"WineDetectionController 모듈 임포트 중 오류 발생: {e}")
except Exception as e:
    logging.error(f"WineDetectionController 블루프린트 등록 중 오류 발생: {e}")

# 로그인 경로 추가
try:
    from modules.LoginController import LoginController
    app.register_blueprint(LoginController)  # 로그인
except ImportError as e:
    logging.error(f"LoginController 모듈 임포트 중 오류 발생: {e}")
except Exception as e:
    logging.error(f"LoginController 블루프린트 등록 중 오류 발생: {e}")

if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0', port=5000, use_reloader=False)
