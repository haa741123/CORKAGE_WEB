from flask import Blueprint, request, jsonify
from roboflow import Roboflow
import os
import traceback

WineDetectionController = Blueprint('winedetection', __name__)

rf = Roboflow(api_key="IsMyX0wK7LxgCLxaXcvQ")
project = rf.workspace("vin-c1flf").project("vin2")
model = project.version(1).model

@WineDetectionController.route('/detect', methods=['POST'])
def detect_vin():
    if 'image' not in request.files:
        return jsonify({"error": "이미지 파일이 제공되지 않았습니다"}), 400

    image = request.files['image']
    if image.filename == '':
        return jsonify({"error": "선택된 파일이 없습니다"}), 400

    if not allowed_file(image.filename):
        return jsonify({"error": "허용되지 않는 파일 형식입니다"}), 400

    image_path = os.path.join("temp", "temp_image.jpg")
    os.makedirs(os.path.dirname(image_path), exist_ok=True)

    try:
        image.save(image_path)
        prediction = model.predict(image_path, confidence=40, overlap=30).json()
        return jsonify(prediction)
    except Exception as e:
        error_trace = traceback.format_exc()
        return jsonify({"error": str(e), "traceback": error_trace}), 500
    finally:
        if os.path.exists(image_path):
            os.remove(image_path)

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


