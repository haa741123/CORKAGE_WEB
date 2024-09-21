from flask import Flask, render_template, session
from flask_cors import CORS
from routes.main_routes import main_routes
from modules.RecommendController import RecommendController
from modules.WineDetectionController import WineDetectionController
from datetime import timedelta

app = Flask(__name__)
CORS(app)  # CORS 설정 추가
app.config['UPLOAD_FOLDER'] = '/home/hamin/flask/images'  # 실제 업로드 폴더 경로로 변경해야 합니다
app.config['SECRET_KEY'] = 'your_secret_key_here'  # 안전한 비밀 키로 변경하세요
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

app.register_blueprint(main_routes)
app.register_blueprint(RecommendController, url_prefix='/api/v1')       # 주류 추천 
app.register_blueprint(WineDetectionController, url_prefix='/api/v1')   # 플러터에서 제공받은 사진 분석

if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0', port=5000, use_reloader=False)