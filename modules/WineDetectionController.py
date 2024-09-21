<<<<<<< HEAD
from flask import Blueprint, request, jsonify, session, current_app
from roboflow import Roboflow
import os
from PIL import Image, UnidentifiedImageError
from io import BytesIO
from datetime import datetime
import uuid
from dotenv import load_dotenv
import easyocr
import json
import logging
from logging.handlers import RotatingFileHandler
import sys
import cv2
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)

# 로깅 설정
log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log_file = '/home/hamin/flask/log/app.log'

# 파일 핸들러 설정
file_handler = RotatingFileHandler(log_file, maxBytes=10240, backupCount=10)
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

# 콘솔 핸들러 설정
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(log_formatter)
console_handler.setLevel(logging.INFO)

# 루트 로거 설정
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

CROPPED_IMAGES_DIR = "/home/hamin/flask/cropped_images"

# Flask Blueprint 생성
WineDetectionController = Blueprint('WineDetectionController', __name__)

@WineDetectionController.record_once
def on_load(state):
    state.app.logger.setLevel(logging.INFO)
    state.app.logger.addHandler(file_handler)
    state.app.logger.addHandler(console_handler)

# .env 파일 로드
dotenv_path = '/var/www/flask/modules/.env'
load_dotenv(dotenv_path)

# JSON 파일 저장 디렉토리 지정
JSON_STORAGE_DIR = "/home/hamin/flask/ocr"

# Roboflow 설정
api_key = os.getenv("ROBOFLOW_API_KEY")
if api_key is None:
    raise ValueError("ROBOFLOW_API_KEY not found in .env file")

rf = Roboflow(api_key=api_key)
project = rf.workspace("vin-c1flf").project("vin2")
model = project.version(1).model

# EasyOCR Reader 초기화
reader = easyocr.Reader(['en'])

# 허용되는 이미지 파일 확장자 목록 정의
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

# 하루에 허용되는 최대 API 호출 수와 광고 시청 후 추가되는 호출 수 정의
MAX_CALLS_PER_DAY = int(os.getenv("MAX_CALLS_PER_DAY", 10))
EXTRA_CALLS_AFTER_AD = int(os.getenv("EXTRA_CALLS_AFTER_AD", 5))

# 유틸리티 함수들
def get_or_create_user_id():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        logging.info(f"New user ID created: {session['user_id']}")
    return session['user_id']

def get_or_reset_daily_calls():
    user_id = get_or_create_user_id()
    today = datetime.now().date()
    session.permanent = True
    if session.get(f'{user_id}_last_call_date') != today:
        session[f'{user_id}_last_call_date'] = today
        session[f'{user_id}_remaining_calls'] = MAX_CALLS_PER_DAY
    return session.get(f'{user_id}_remaining_calls', MAX_CALLS_PER_DAY)

def modify_remaining_calls(change=0):
    user_id = get_or_create_user_id()
    try:
        session[f'{user_id}_remaining_calls'] = max(0, session.get(f'{user_id}_remaining_calls', MAX_CALLS_PER_DAY) + change)
        session.modified = True
        logging.info(f"Modified remaining calls for user {user_id}: {session[f'{user_id}_remaining_calls']}")
    finally:
        session.permanent = True

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def crop_image(image, coordinates):
    x_center, y_center, width, height = coordinates
    left = x_center - (width / 2)
    top = y_center - (height / 2)
    right = x_center + (width / 2)
    bottom = y_center + (height / 2)
    logging.info(f"Cropping image with coordinates: {left}, {top}, {right}, {bottom}")
    return image.crop((left, top, right, bottom))

def detect_text_easyocr(image_bytes):
    logging.info("Starting OCR process with EasyOCR")
    results = reader.readtext(image_bytes)
    logging.info(f"EasyOCR results: {results}")
    extracted_text = ' '.join([result[1] for result in results])
    logging.info(f"Extracted text: {extracted_text}")
    return extracted_text if extracted_text else "텍스트가 감지되지 않았습니다."

def save_extracted_text_to_json(extracted_text, user_id):
    try:
        filename = f'extracted_text_{user_id}_{datetime.now().strftime("%Y%m%d%H%M%S")}.json'
        filepath = os.path.join(JSON_STORAGE_DIR, filename)
        data = {
            'user_id': user_id,
            'extracted_text': extracted_text,
            'timestamp': datetime.now().isoformat()
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        logging.info(f"JSON file created: {filepath}")
        return filepath
    except Exception as e:
        logging.error(f"Error in save_extracted_text_to_json: {str(e)}")
        return None

def delete_image(image_path):
    if os.path.isfile(image_path):
        os.remove(image_path)
        logging.info(f'이미지 파일 삭제 완료: {image_path}')
    else:
        logging.warning(f'파일을 찾을 수 없습니다: {image_path}')

# API 엔드포인트
@WineDetectionController.route('/detect', methods=['POST'])
def detect_vin():
    try:
        logging.info("Received detect request")
        remaining_calls = get_or_reset_daily_calls()
        user_id = get_or_create_user_id()
        logging.info(f"User ID: {user_id}, Remaining calls: {remaining_calls}")

        if remaining_calls <= 0:
            return jsonify({"error": "오늘의 호출 한도를 초과했습니다."}), 403

        if 'image' not in request.files or not request.files['image'].filename:
            return jsonify({"error": "이미지 파일이 제공되지 않았습니다."}), 400

        image = request.files['image']
        if not allowed_file(image.filename):
            return jsonify({"error": "허용되지 않는 파일 형식입니다."}), 400

        temp_image_path = os.path.join('/home/hamin/flask/images', f'temp_{user_id}.jpg')
        try:
            logging.info("Processing image")
            modify_remaining_calls(-1)
            image.save(temp_image_path)
            logging.info(f"Image saved to {temp_image_path}")

            img = cv2.imread(temp_image_path)
            if img is None:
                raise ValueError(f"Failed to open image file: {temp_image_path}")

            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            logging.info("Sending request to Roboflow API")

            prediction = model.predict(img_rgb, confidence=40, overlap=30).json()
            logging.info("Received response from Roboflow API")

            if not prediction.get("predictions"):
                raise ValueError("No predictions found in Roboflow result")

            maker_name_predictions = [p for p in prediction['predictions'] if p['class'] == 'Maker-Name']
            if not maker_name_predictions:
                raise ValueError("No Maker-Name detected in the image")

            maker_name_prediction = max(maker_name_predictions, key=lambda x: x['confidence'])
            label_coordinates = maker_name_prediction['x'], maker_name_prediction['y'], \
                                maker_name_prediction['width'], maker_name_prediction['height']

            img_pil = Image.fromarray(img_rgb)
            cropped_img = crop_image(img_pil, label_coordinates)

            os.makedirs(CROPPED_IMAGES_DIR, exist_ok=True)
            cropped_img_path = os.path.join(CROPPED_IMAGES_DIR, f'cropped_{user_id}.jpg')
            cropped_img.save(cropped_img_path)

            cropped_img_bytes = BytesIO()
            cropped_img.save(cropped_img_bytes, format='JPEG')

            extracted_text = detect_text_easyocr(cropped_img_bytes.getvalue())
            log_message = f"OCR 결과 (Maker-Name): {extracted_text}"
            logging.info(log_message)

            json_filepath = save_extracted_text_to_json(extracted_text, user_id)
            if json_filepath is None:
                raise ValueError("Failed to save OCR result to JSON")

            session['ocr_result'] = {
                "extracted_text": extracted_text,
                "log": log_message,
                "timestamp": datetime.now().isoformat()
            }
            logging.info("OCR result saved to session")

            return jsonify({
                "message": "Image processed successfully",
                "remaining_calls": get_or_reset_daily_calls(),
                "ocr_result": {
                    "extracted_text": extracted_text,
                    "log": log_message,
                    "cropped_image_path": cropped_img_path
                }
            })

        except ValueError as ve:
            logging.error(f"Value error: {str(ve)}")
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            logging.exception(f"Unexpected error occurred: {str(e)}")
            return jsonify({"error": "An unexpected error occurred during image processing."}), 500
        finally:
            delete_image(temp_image_path)

    except Exception as e:
        logging.exception(f"Critical error in detect_vin: {str(e)}")
        return jsonify({"error": "A critical error occurred. Please try again later."}), 500

@WineDetectionController.route('/watch_ad', methods=['POST'])
def watch_ad():
    modify_remaining_calls(EXTRA_CALLS_AFTER_AD)
    logging.info(f"Ad watched, calls added. New remaining calls: {get_or_reset_daily_calls()}")
    return jsonify({"message": "광고 시청 완료, 호출 횟수가 추가되었습니다.", "remaining_calls": get_or_reset_daily_calls()})

@WineDetectionController.route('/get_ocr_result', methods=['GET'])
def get_ocr_result():
    logging.info("Received request for OCR result")
    ocr_result = session.get('ocr_result', {})
    if not ocr_result:
        logging.warning("No OCR result found in session")
        return jsonify({"error": "No OCR result found", "session_data": dict(session)}), 404
    
    if 'timestamp' in ocr_result:
        result_time = datetime.fromisoformat(ocr_result['timestamp'])
        if (datetime.now() - result_time).total_seconds() > 3600:
            logging.warning("OCR result has expired")
            return jsonify({"error": "OCR result has expired"}), 410
    
    logging.info(f"Returning OCR result: {ocr_result}")
    return jsonify(ocr_result)
=======
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
>>>>>>> 3710425411c69caf537288da72e95e9c794ef9e5
