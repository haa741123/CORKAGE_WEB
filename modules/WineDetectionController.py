# 작성자: [전지훈], [이하민]
# 수정한 날짜: [2024-09-12]
# 코드 용도: 와인 라벨을 감지 -> Google Vision API로 라벨의 텍스트를 추출 -> 이미지 처리

# 주요 기능:
# 1. 와인 라벨 감지 : Roboflow의 YOLO 모델
# 2. 텍스트 추출    : Google Cloud Vision API
# 3. 호출 제한 관리 : 수익화 
# 4. 이미지 자르는 로직

from flask import Blueprint, request, jsonify, session
from roboflow import Roboflow
import os
from google.cloud import vision
from PIL import Image, UnidentifiedImageError
from io import BytesIO
from datetime import datetime
import uuid
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

# Flask Blueprint 생성
WineDetectionController = Blueprint('WineDetectionController', __name__)

# Google Cloud Vision API 클라이언트 설정
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
client = vision.ImageAnnotatorClient()

# Roboflow 설정 (YOLO 모델 API 키)
rf = Roboflow(api_key=os.getenv("IsMyX0wK7LxgCLxaXcvQ"))
project = rf.workspace("vin-c1flf").project("vin2")
model = project.version(1).model

# 허용되는 이미지 파일 확장자 목록 정의
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

# 하루에 허용되는 최대 API 호출 수와 광고 시청 후 추가되는 호출 수 정의
MAX_CALLS_PER_DAY = 10
EXTRA_CALLS_AFTER_AD = 5

# 고유 사용자 ID를 세션에 설정하는 함수
def get_or_create_user_id():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return session['user_id']

# 사용자별로 호출 횟수를 관리하는 함수 (매일 호출 횟수를 초기화하거나 유지하며 관리)
def get_or_reset_daily_calls():
    user_id = get_or_create_user_id()
    today = datetime.now().date()

    session.permanent = True  # 세션 만료 시간을 하루로 설정

    # 세션에 저장된 마지막 호출 날짜가 다르면 리셋
    if session.get(f'{user_id}_last_call_date') != today:
        session[f'{user_id}_last_call_date'] = today
        session[f'{user_id}_remaining_calls'] = MAX_CALLS_PER_DAY

    return session.get(f'{user_id}_remaining_calls', MAX_CALLS_PER_DAY)

# 호출 횟수를 수정하는 함수 (원자적 업데이트)
def modify_remaining_calls(change=0):
    user_id = get_or_create_user_id()
    try:
        session[f'{user_id}_remaining_calls'] = max(0, session.get(f'{user_id}_remaining_calls', MAX_CALLS_PER_DAY) + change)
        session.modified = True  # 세션이 변경되었음을 명시적으로 표시
    finally:
        session.permanent = True  # 세션 만료 시간 연장

# 업로드된 파일이 허용된 확장자인지 확인하는 함수
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# YOLO가 감지한 좌표를 기반으로 이미지를 자르는 함수
def crop_image(image, coordinates):
    x_center, y_center, width, height = coordinates
    left = x_center - (width / 2)
    top = y_center - (height / 2)
    right = x_center + (width / 2)
    bottom = y_center + (height / 2)
    return image.crop((left, top, right, bottom))

# Google Vision API를 사용하여 이미지에서 텍스트를 추출하는 함수
def detect_text_google_vision(image_bytes):
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)
    texts = response.text_annotations

    if response.error.message:
        raise Exception(f'{response.error.message}')
    return texts[0].description if texts else "텍스트가 감지되지 않았습니다."

# 와인 라벨을 감지하고 텍스트를 추출하는 API 엔드포인트
@WineDetectionController.route('/detect', methods=['POST'])
def detect_vin():
    remaining_calls = get_or_reset_daily_calls()

    if remaining_calls <= 0:
        return jsonify({"error": "오늘의 호출 한도를 초과했습니다."}), 403

    if 'image' not in request.files or not request.files['image'].filename:
        return jsonify({"error": "이미지 파일이 제공되지 않았습니다."}), 400

    image = request.files['image']
    if not allowed_file(image.filename):
        return jsonify({"error": "허용되지 않는 파일 형식입니다."}), 400

    try:
        # 호출 횟수 1 감소
        modify_remaining_calls(-1)

        # 이미지 파일을 메모리로 처리
        image_bytes = image.read()
        try:
            img = Image.open(BytesIO(image_bytes))  # PIL을 사용하여 이미지를 열기
        except UnidentifiedImageError:
            return jsonify({"error": "이미지 파일을 열 수 없습니다. 손상되었거나 잘못된 파일입니다."}), 400

        # YOLO 모델을 사용하여 와인 라벨 감지
        prediction = model.predict(image_bytes, confidence=40, overlap=30).json()

        if not prediction.get("predictions"):
            return jsonify({"error": "와인 라벨이 감지되지 않았습니다."}), 404

        # 감지된 좌표를 사용하여 이미지를 자르고 텍스트를 추출
        label_coordinates = prediction['predictions'][0]['x'], prediction['predictions'][0]['y'], \
                            prediction['predictions'][0]['width'], prediction['predictions'][0]['height']

        cropped_img = crop_image(img, label_coordinates)
        cropped_img_bytes = BytesIO()
        cropped_img.save(cropped_img_bytes, format='JPEG')

        extracted_text = detect_text_google_vision(cropped_img_bytes.getvalue())

        return jsonify({
            "prediction": prediction,
            "extracted_text": extracted_text,
            "remaining_calls": get_or_reset_daily_calls()
        })

    except Exception as e:
        return jsonify({"error": f"이미지 처리 중 오류가 발생했습니다: {str(e)}"}), 500

# 광고를 시청하고 추가 호출 횟수를 제공하는 API 엔드포인트
@WineDetectionController.route('/watch_ad', methods=['POST'])
def watch_ad():
    modify_remaining_calls(EXTRA_CALLS_AFTER_AD)
    return jsonify({"message": "광고 시청 완료, 호출 횟수가 추가되었습니다.", "remaining_calls": get_or_reset_daily_calls()})
