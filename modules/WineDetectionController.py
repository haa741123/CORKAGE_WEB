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
from PIL import Image
from io import BytesIO
from datetime import datetime

WineDetectionController = Blueprint('WineDetectionController', __name__)

# Google Cloud Vision API 클라이언트 설정
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/path/to/your/service_account_key.json"
client = vision.ImageAnnotatorClient()

# Roboflow 설정 (YOLO 모델 API 키)
rf = Roboflow(api_key="IsMyX0wK7LxgCLxaXcvQ")
project = rf.workspace("vin-c1flf").project("vin2")
model = project.version(1).model

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
MAX_CALLS_PER_DAY = 10
EXTRA_CALLS_AFTER_AD = 5

def get_or_reset_daily_calls():
    today = datetime.now().date()
    if session.get('last_call_date') != today:
        session['last_call_date'] = today
        session['remaining_calls'] = MAX_CALLS_PER_DAY
    return session.get('remaining_calls', MAX_CALLS_PER_DAY)

def modify_remaining_calls(change=0):
    session['remaining_calls'] = max(0, session.get('remaining_calls', MAX_CALLS_PER_DAY) + change)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def crop_image(image, coordinates):
    """YOLO가 감지한 좌표를 바탕으로 이미지를 자르는 함수"""
    x_center, y_center, width, height = coordinates
    left = x_center - (width / 2)
    top = y_center - (height / 2)
    right = x_center + (width / 2)
    bottom = y_center + (height / 2)
    return image.crop((left, top, right, bottom))

def detect_text_google_vision(image_bytes):
    """Google Vision API를 사용해 이미지에서 텍스트를 추출하는 함수"""
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)
    texts = response.text_annotations
    if response.error.message:
        raise Exception(f'{response.error.message}')
    return texts[0].description if texts else "텍스트가 감지되지 않았습니다."

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
        modify_remaining_calls(-1)

        # 이미지 파일 메모리로 처리
        image_bytes = image.read()
        img = Image.open(BytesIO(image_bytes))

        # YOLO 모델로 와인 라벨 감지
        prediction = model.predict(image_bytes, confidence=40, overlap=30).json()
        if not prediction.get("predictions"):
            return jsonify({"error": "와인 라벨이 감지되지 않았습니다."}), 404

        # 감지된 좌표에 따라 이미지를 자르고 텍스트 추출
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

@WineDetectionController.route('/watch_ad', methods=['POST'])
def watch_ad():
    """사용자가 광고를 시청하고 호출 횟수를 추가하는 엔드포인트"""
    modify_remaining_calls(EXTRA_CALLS_AFTER_AD)
    return jsonify({"message": "광고 시청 완료, 호출 횟수가 추가되었습니다.", "remaining_calls": get_or_reset_daily_calls()})
