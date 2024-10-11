from flask import Blueprint, request, jsonify, session, current_app
from roboflow import Roboflow
import os
from PIL import Image, UnidentifiedImageError
from io import BytesIO
from datetime import datetime, timedelta
import uuid
from dotenv import load_dotenv
import easyocr
import json
import logging
import google.generativeai as genai
from logging.handlers import RotatingFileHandler
import sys
import cv2
import numpy as np
import requests
from werkzeug.utils import secure_filename
import google.generativeai as genai

# 해야되는 설정
# $ pip install google-generativeai

# Google Gemini API 설정
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "application/json",
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
)

# 환경 변수 로드
dotenv_path = '/var/www/flask/modules/.env'
load_dotenv(dotenv_path)

# 상수 정의
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
MAX_CALLS_PER_DAY = int(os.getenv("MAX_CALLS_PER_DAY", 10))
EXTRA_CALLS_AFTER_AD = int(os.getenv("EXTRA_CALLS_AFTER_AD", 5))
JSON_STORAGE_DIR = os.getenv("JSON_STORAGE_DIR", "./ocr_results")
CROPPED_IMAGES_DIR = os.getenv("CROPPED_IMAGES_DIR", "./cropped_images")
TEMP_IMAGES_DIR = os.getenv("TEMP_IMAGES_DIR", "./temp_images")

# 디렉토리 생성
os.makedirs(JSON_STORAGE_DIR, exist_ok=True)
os.makedirs(CROPPED_IMAGES_DIR, exist_ok=True)
os.makedirs(TEMP_IMAGES_DIR, exist_ok=True)

# 로거 설정
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

if not logger.handlers:
    # 파일 핸들러
    file_handler = RotatingFileHandler('app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(log_formatter)
    file_handler.setLevel(logging.INFO)
    logger.addHandler(file_handler)

    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)

# Roboflow 설정
api_key = os.getenv("ROBOFLOW_API_KEY")
if not api_key:
    logger.error("ROBOFLOW_API_KEY가 환경 변수에 설정되지 않았습니다.")
    raise ValueError("ROBOFLOW_API_KEY 세팅 문제")

rf = Roboflow(api_key=api_key)
project = rf.workspace("vin-c1flf").project("vin2")
model = project.version(1).model

# EasyOCR Reader 초기화 (스레드 안전)
reader = easyocr.Reader(['en'], gpu=False)

# Flask Blueprint 생성
WineDetectionController = Blueprint('WineDetectionController', __name__)

# 세션 만료 및 관리
@WineDetectionController.before_request
def make_session_permanent():
    session.permanent = True
    current_app.permanent_session_lifetime = timedelta(days=1)

# 유틸리티 함수들
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 세션에 사용자 ID가 없으면 새로 생성하고 반환하는 함수
def get_or_create_user_id():
    user_id = session.get('user_id')
    if not user_id:
        user_id = str(uuid.uuid4())
        session['user_id'] = user_id
        # logger.info(f"새로운 사용자 ID 생성됨: {user_id}")
    return user_id

# 사용자가 남은 호출 횟수를 가져오는 함수, 날짜가 바뀌면 횟수를 리셋
def get_remaining_calls():
    user_id = get_or_create_user_id()
    today = datetime.utcnow().date()
    last_call_date = session.get(f'{user_id}_last_call_date')
    remaining_calls = session.get(f'{user_id}_remaining_calls', MAX_CALLS_PER_DAY)
    if last_call_date != today:
        session[f'{user_id}_last_call_date'] = today
        remaining_calls = MAX_CALLS_PER_DAY
        session[f'{user_id}_remaining_calls'] = remaining_calls
    return remaining_calls

# 남은 호출 횟수를 변경하는 함수
def modify_remaining_calls(change):
    user_id = get_or_create_user_id()
    remaining_calls = session.get(f'{user_id}_remaining_calls', MAX_CALLS_PER_DAY)
    remaining_calls = max(0, remaining_calls + change)
    session[f'{user_id}_remaining_calls'] = remaining_calls
    session.modified = True
    # logger.info(f"사용자 {user_id}의 남은 호출 횟수 변경됨: {remaining_calls}")

# 이미지를 주어진 좌표로 자르는 함수
def crop_image(image, coordinates):
    x_center, y_center, width, height = coordinates
    left = x_center - (width / 2)
    top = y_center - (height / 2)
    right = x_center + (width / 2)
    bottom = y_center + (height / 2)
    # logger.info(f"이미지를 다음 좌표로 자릅니다: {left}, {top}, {right}, {bottom}")
    return image.crop((left, top, right, bottom))

# EasyOCR를 사용하여 이미지에서 텍스트를 감지하는 함수
def detect_text_easyocr(image_bytes):
    logger.info("EasyOCR로 OCR 프로세스 시작")
    try:
        image = Image.open(BytesIO(image_bytes))
        image_np = np.array(image)
        results = reader.readtext(image_np)
        logger.info(f"EasyOCR 결과: {results}")
        extracted_text = ' '.join([result[1] for result in results])
        logger.info(f"추출된 텍스트: {extracted_text}")
        return extracted_text if extracted_text else "텍스트가 감지되지 않았습니다."
    except Exception as e:
        logger.exception(f"OCR 처리 중 오류 발생: {str(e)}")
        return "OCR 처리 중 오류 발생."

# 추출된 텍스트를 JSON 파일로 저장하는 함수
def save_extracted_text_to_json(extracted_text, user_id):
    try:
        filename = f'extracted_text_{user_id}_{datetime.now().strftime("%Y%m%d%H%M%S")}.json'
        filepath = os.path.join(JSON_STORAGE_DIR, filename)
        data = {
            'user_id': user_id,
            'extracted_text': extracted_text,
            'timestamp': datetime.utcnow().isoformat()
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        logger.info(f"JSON 파일 생성됨: {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"save_extracted_text_to_json에서 오류 발생: {str(e)}")
        return None

# 이미지 파일을 삭제하는 함수
def delete_image(image_path):
    try:
        if os.path.isfile(image_path):
            os.remove(image_path)
            logger.info(f'이미지 파일 삭제 완료: {image_path}')
        else:
            logger.warning(f'파일을 찾을 수 없습니다: {image_path}')
    except Exception as e:
        logger.error(f"이미지 삭제 중 오류 발생 {image_path}: {str(e)}")

# 이미지를 최대 크기로 리사이즈하는 함수
def resize_image(image, max_size=(800, 800)):
    image.thumbnail(max_size)
    return image

# Multipart를 사용하여 Roboflow API에 이미지를 업로드하고 예측 결과를 받는 함수
def predict_with_multipart(image_path, api_url, api_key):
    try:
        with open(image_path, 'rb') as image_file:
            files = {'file': image_file}
            params = {
                'api_key': api_key,
                'confidence': 40,
                'overlap': 30,
                'format': 'json'
            }
            response = requests.post(api_url, files=files, params=params)
            response.raise_for_status()
            return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"predict_with_multipart에서 오류 발생: {str(e)}")
        raise

# Roboflow 예측 결과를 처리하고 텍스트를 추출하는 함수
def process_prediction(image_path, prediction):
    try:
        with Image.open(image_path) as img:
            label_coordinates = prediction['x'], prediction['y'], prediction['width'], prediction['height']
            cropped_img = crop_image(img, label_coordinates)
            cropped_img_bytes_io = BytesIO()
            cropped_img.save(cropped_img_bytes_io, format='JPEG')
            cropped_img_bytes = cropped_img_bytes_io.getvalue()
            extracted_text = detect_text_easyocr(cropped_img_bytes)
        return extracted_text
    except Exception as e:
        logger.error(f"예측 처리 중 오류 발생: {str(e)}")
        return "예측 처리 중 오류 발생."

# API 엔드포인트
@WineDetectionController.route('/detect', methods=['POST'])
def detect_vin():
    logger.info("감지 요청을 수신하였습니다")
    try:
        remaining_calls = get_remaining_calls()
        user_id = get_or_create_user_id()
        logger.info(f"사용자 ID: {user_id}, 남은 호출 횟수: {remaining_calls}")

        if remaining_calls <= 0:
            return jsonify({"error": "오늘의 호출 한도를 초과했습니다."}), 403

        if 'image' not in request.files or not request.files['image'].filename:
            return jsonify({"error": "이미지 파일이 제공되지 않았습니다."}), 400

        image_file = request.files['image']
        if not allowed_file(image_file.filename):
            return jsonify({"error": "허용되지 않는 파일 형식입니다."}), 400

        filename = secure_filename(f"temp_{user_id}.jpg")
        temp_image_path = os.path.join(TEMP_IMAGES_DIR, filename)

        try:
            modify_remaining_calls(-1)

            with Image.open(image_file) as img:
                img = resize_image(img)
                img.save(temp_image_path)
            logger.info(f"크기 조정된 이미지가 {temp_image_path}에 저장되었습니다")

            api_url = "https://detect.roboflow.com/vin2/1"
            prediction = predict_with_multipart(temp_image_path, api_url, api_key)
            logger.info("Roboflow API로부터 응답을 받았습니다")

            if not prediction.get("predictions"):
                logger.warning("Roboflow 응답에서 예측을 찾을 수 없습니다")
                return jsonify({"error": "이미지에서 예측을 찾을 수 없습니다."}), 200

            # OCR 결과에서 주류 이름 추출
            results = {}
            wine_name = None

            for class_name in ['Maker-Name', 'VintageYear', 'TypeWine Type']:
                predictions = [p for p in prediction['predictions'] if p['class'] == class_name]
                if predictions:
                    best_prediction = max(predictions, key=lambda x: x['confidence'])
                    extracted_text = process_prediction(temp_image_path, best_prediction)
                    results[class_name] = extracted_text
                    if class_name == 'Maker-Name':
                        wine_name = extracted_text

            if not results or not wine_name:
                logger.warning("처리 후 관련 예측이 없습니다")
                return jsonify({"error": "이미지에서 관련 텍스트를 감지할 수 없습니다."}), 200

            # Google Gemini API를 통해 주류 정보 요청
            chat_session = model.start_chat(
                history=[
                    {
                        "role": "user",
                        "parts": [
                            f"\"{wine_name}\" Provide this wine information in the form of JSON \n\nNecessary information\n\nProduct Name\nProduct Image\nProduct Description\nOrigin\nType and Classification\nAlcohol\nTaste and Aroma\nRecommeded Consumption Temperature\nPairing Food\nPrice information\nStorage\ncaution"
                        ],
                    }
                ]
            )

            response = chat_session.send_message(wine_name)
            wine_info = response.text

            # 결과 저장 및 응답 반환
            json_filepath = save_extracted_text_to_json(results, user_id)
            if not json_filepath:
                logger.error("OCR 결과를 JSON으로 저장하는 데 실패했습니다")
                return jsonify({"error": "OCR 결과를 저장하는 데 실패했습니다."}), 500

            session['ocr_result'] = {
                "extracted_text": results,
                "wine_info": wine_info,
                "timestamp": datetime.utcnow().isoformat()
            }
            session.modified = True
            logger.info("OCR 결과가 세션에 저장되었습니다")

            return jsonify({
                "message": "이미지가 성공적으로 처리되었습니다.",
                "remaining_calls": get_remaining_calls(),
                "ocr_result": results,
                "wine_info": wine_info
            }), 200

        except Exception as e:
            logger.exception(f"오류 발생: {str(e)}")
            return jsonify({"error": "오류가 발생했습니다."}), 500

        finally:
            delete_image(temp_image_path)

    except Exception as e:
        logger.exception(f"detect_vin에서 오류 발생: {str(e)}")
        return jsonify({"error": "오류가 발생했습니다. 나중에 다시 시도해주세요."}), 500
@WineDetectionController.route('/watch_ad', methods=['POST'])
def watch_ad():
    modify_remaining_calls(EXTRA_CALLS_AFTER_AD)
    logger.info(f"광고 시청 완료, 호출 횟수가 추가되었습니다. 새로운 남은 호출 횟수: {get_remaining_calls()}")
    return jsonify({"message": "광고 시청 완료, 호출 횟수가 추가되었습니다.", "remaining_calls": get_remaining_calls()}), 200

@WineDetectionController.route('/get_ocr_result', methods=['GET'])
def get_ocr_result():
    logger.info("OCR 결과 요청을 수신하였습니다")
    ocr_result = session.get('ocr_result')
    if not ocr_result:
        logger.warning("세션에서 OCR 결과를 찾을 수 없습니다")
        return jsonify({"error": "OCR 결과를 찾을 수 없습니다."}), 404

    result_time = datetime.fromisoformat(ocr_result.get('timestamp'))
    if (datetime.utcnow() - result_time).total_seconds() > 3600:
        logger.warning("OCR 결과가 만료되었습니다")
        return jsonify({"error": "OCR 결과가 만료되었습니다."}), 410

    logger.info(f"OCR 결과 반환 중: {ocr_result}")
    return jsonify(ocr_result), 200
