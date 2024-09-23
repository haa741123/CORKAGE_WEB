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
import requests

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

def resize_image(image, max_size=(800, 800)):
    image.thumbnail(max_size)
    return image

def predict_with_multipart(image_path, api_url, api_key):
    with open(image_path, 'rb') as image_file:
        files = {'file': image_file}
        params = {
            'api_key': api_key,
            'confidence': 40,
            'overlap': 30,
            'format': 'json'
        }
        response = requests.post(api_url, files=files, params=params)
    return response.json()

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
            
            # 이미지 크기 조정
            with Image.open(image) as img:
                img = resize_image(img)
                img.save(temp_image_path)
            
            logging.info(f"Resized image saved to {temp_image_path}")

            # Roboflow API 호출
            api_url = "https://detect.roboflow.com/vin2/1"
            prediction = predict_with_multipart(temp_image_path, api_url, api_key)
            logging.info("Received response from Roboflow API")

            if not prediction.get("predictions"):
                raise ValueError("No predictions found in Roboflow result")

            # 각 클래스에 대한 예측 추출
            maker_name_predictions = [p for p in prediction['predictions'] if p['class'] == 'Maker-Name']
            vintage_year_predictions = [p for p in prediction['predictions'] if p['class'] == 'VintageYear']
            wine_type_predictions = [p for p in prediction['predictions'] if p['class'] == 'TypeWine Type']

            results = {}

            # Maker-Name 처리
            if maker_name_predictions:
                maker_name_prediction = max(maker_name_predictions, key=lambda x: x['confidence'])
                results['Maker-Name'] = process_prediction(temp_image_path, maker_name_prediction)

            # VintageYear 처리
            if vintage_year_predictions:
                vintage_year_prediction = max(vintage_year_predictions, key=lambda x: x['confidence'])
                results['VintageYear'] = process_prediction(temp_image_path, vintage_year_prediction)

            # TypeWine Type 처리
            if wine_type_predictions:
                wine_type_prediction = max(wine_type_predictions, key=lambda x: x['confidence'])
                results['TypeWine Type'] = process_prediction(temp_image_path, wine_type_prediction)

            # 결과 저장 및 반환
            json_filepath = save_extracted_text_to_json(results, user_id)
            if json_filepath is None:
                raise ValueError("Failed to save OCR results to JSON")

            session['ocr_result'] = {
                "extracted_text": results,
                "timestamp": datetime.now().isoformat()
            }

            logging.info("OCR results saved to session")

            return jsonify({
                "message": "Image processed successfully",
                "remaining_calls": get_or_reset_daily_calls(),
                "ocr_result": results
            })

        except ValueError as ve:
            logging.error(f"Value error: {str(ve)}")
            return jsonify({"error": str(ve)}), 400
        except requests.exceptions.RequestException as re:
            logging.error(f"Request error: {str(re)}")
            return jsonify({"error": "Failed to communicate with Roboflow API"}), 500
        except Exception as e:
            logging.exception(f"Unexpected error occurred: {str(e)}")
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
        finally:
            delete_image(temp_image_path)

    except Exception as e:
        logging.exception(f"Critical error in detect_vin: {str(e)}")
        return jsonify({"error": "A critical error occurred. Please try again later."}), 500

def process_prediction(image_path, prediction):
    with Image.open(image_path) as img:
        label_coordinates = prediction['x'], prediction['y'], prediction['width'], prediction['height']
        cropped_img = crop_image(img, label_coordinates)
        cropped_img_bytes = BytesIO()
        cropped_img.save(cropped_img_bytes, format='JPEG')
        extracted_text = detect_text_easyocr(cropped_img_bytes.getvalue())
    return extracted_text

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