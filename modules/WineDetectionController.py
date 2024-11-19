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
from google.ai.generativelanguage_v1beta.types import content
from flask import make_response
from dotenv import load_dotenv
from supabase import create_client

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)
    
# 환경 변수 로드
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Supabase 클라이언트 생성
supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)    

# 로깅 설정
log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log_file = '/home/hamin/flask/log/app.log'
logging.basicConfig(encoding='utf-8', level=logging.INFO)


# 파일 핸들러 설정
file_handler = RotatingFileHandler(log_file, maxBytes=10240, backupCount=10, encoding='utf-8')
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
roboflow_model = project.version(1).model

# Create the model
generation_config = {
  "temperature": 0.5,
  "top_p": 0.95,
  "top_k": 64,
  "max_output_tokens": 8192,
  "response_schema": content.Schema(
    type = content.Type.OBJECT,
    properties = {
      "productName": content.Schema(
        type = content.Type.STRING,
      ),
      "varietal": content.Schema(
        type = content.Type.STRING,
      ),
      "region": content.Schema(
        type = content.Type.STRING,
      ),
      "appellation": content.Schema(
        type = content.Type.STRING,
      ),
      "vintage": content.Schema(
        type = content.Type.STRING,
      ),
      "description": content.Schema(
        type = content.Type.STRING,
      ),
      "tasting_notes": content.Schema(
        type = content.Type.STRING,
      ),
      "PairingFood": content.Schema(
        type = content.Type.STRING,
      ),
      "awards": content.Schema(
        type = content.Type.STRING,
      ),
      "production": content.Schema(
        type = content.Type.STRING,
      ),
      "alcohol": content.Schema(
        type = content.Type.STRING,
      ),
    },
  ),
  "response_mime_type": "application/json",
}


# Gemini 모델 초기화
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
gemini_model = genai.GenerativeModel(
  model_name="gemini-1.5-flash",
  generation_config=generation_config,
)
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
    
    # 각 텍스트의 y좌표를 기준으로 정렬
    sorted_results = sorted(results, key=lambda x: x[0][0][1])  # y좌표로 정렬
    
    # 각 줄을 따로 처리
    lines = []
    current_y = None
    current_line = []
    
    for result in sorted_results:
        y_coord = result[0][0][1]  # 텍스트의 y좌표
        
        # 새로운 줄인지 확인 (y좌표 차이가 일정 값 이상이면 새로운 줄로 간주)
        if current_y is None or abs(y_coord - current_y) > 10:
            if current_line:
                lines.append(' '.join([text[1] for text in current_line]))
            current_line = [result]
            current_y = y_coord
        else:
            current_line.append(result)
    
    # 마지막 줄 처리
    if current_line:
        lines.append(' '.join([text[1] for text in current_line]))
    
    # 줄별로 합치기
    extracted_text = ' '.join(lines)
    logging.info(f"Extracted text by lines: {lines}")
    logging.info(f"Final extracted text: {extracted_text}")
    
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





# DB에서 주류 정보를 조회
def get_wine_info_from_db(extracted_text):
    try:
        # Supabase에서 주류 이름을 검색하는 쿼리
        response = supabase_client.table('drinks') \
                .select('id, name, description, type, alcohol_content, pairing_food, body, sweetness') \
                .eq('name', extracted_text) \
                .execute()

        wine_info = response.data

        # 데이터가 비어있는지 확인
        if not wine_info or len(wine_info) == 0:
            logging.info(f"DB에 '{extracted_text}'에 해당하는 주류 정보가 없습니다.")
            return None

        # 데이터가 존재할 경우 반환
        logging.info(f"DB에서 주류 정보 찾음: {wine_info}")
        return {
            "ProductName": wine_info[0].get('name', '정보 없음'),
            "ProductType": wine_info[0].get('type', '정보 없음'),
            "description": wine_info[0].get('description', '정보 없음'),
            "alcohol": wine_info[0].get('alcohol_content', '정보 없음'),
            "PairingFood": wine_info[0].get('pairing_food', '정보 없음'),
            "Body": wine_info[0].get('body', '정보 없음'),
            "Sweetness": wine_info[0].get('sweetness', '정보 없음')
        }

    except Exception as e:
        # 예외 처리 및 로그 기록
        logging.error(f"DB 조회 중 오류 발생: {str(e)}")
        return None





# 주류 인식 API 엔드포인트
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

            prediction = roboflow_model.predict(img_rgb, confidence=40, overlap=30).json()
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
            extracted_text = extracted_text.lower()
            log_message = f"OCR 결과 (Maker-Name): {extracted_text}"
            logging.info(log_message)

            # 1. DB에서 주류 정보 확인 (Supabase 사용)
            wine_info_json = get_wine_info_from_db(extracted_text)

            # 2. DB에 정보가 없으면 Gemini 모델 호출
            if not wine_info_json:
                logging.info("DB에 정보가 없어 Google Gemini API 호출")
                chat = gemini_model.start_chat()
                response = chat.send_message(f"\"{extracted_text}\" Provide this wine information in JSON format with the fields: ProductName, description, alcohol, PairingFood, Body, Sweetness. Translate the content into Korean if possible.")
                wine_info = response.text

                try:
                    wine_info_json = json.loads(wine_info)
                except json.JSONDecodeError as e:
                    logging.error(f"JSON 생성에 실패함: {str(e)}")
                    return jsonify({"error": "Google Gemini API 응답이 JSON 형식이 아닙니다."}), 500

                # 필수 필드 체크 및 기본 값 할당
                required_fields = ["ProductName", "description", "alcohol", "PairingFood", "Body", "Sweetness"]
                for field in required_fields:
                    if field not in wine_info_json:
                        wine_info_json[field] = "데이터가 제공되지 않았습니다."

            # JSON 파일 저장
            json_filepath = save_extracted_text_to_json(extracted_text, user_id)
            if json_filepath is None:
                raise ValueError("Failed to save OCR result to JSON")

            session['ocr_result'] = {
                "extracted_text": extracted_text,
                "wine_info": wine_info_json,
                "log": log_message,
                "timestamp": datetime.now().isoformat()
            }
            logging.info("OCR result saved to session")

            response_data = {
                "message": "Image processed successfully",
                "remaining_calls": get_or_reset_daily_calls(),
                "ocr_result": {
                    "extracted_text": extracted_text,
                    "wine_info": wine_info_json,
                    "log": log_message,
                    "cropped_image_path": cropped_img_path
                }
            }
            return make_response(json.dumps(response_data, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'})

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
    logging.info("OCR 결과 요청을 받았습니다.")
    ocr_result = session.get('ocr_result', {})
    if not ocr_result:
        logging.warning("세션에 OCR 결과가 없습니다.")
        return jsonify({"error": "세션에 OCR 결과가 없습니다."}), 404
    
    if 'timestamp' in ocr_result:
        result_time = datetime.fromisoformat(ocr_result['timestamp'])
        if (datetime.now() - result_time).total_seconds() > 3600:
            logging.warning("OCR 결과가 만료되었습니다.")
            return jsonify({"error": "OCR 결과가 만료되었습니다."}), 410
    
    logging.info(f"OCR 결과 반환: {ocr_result}")
    return jsonify(ocr_result)