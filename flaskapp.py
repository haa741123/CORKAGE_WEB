from flask import Flask, render_template
from routes.main_routes import main_routes
from modules.RecommendController import RecommendController
from modules.WineDetectionController import WineDetectionController
import os

# os.environ["ROBOFLOW_API_KEY"] = "IsMyX0wK7LxgCLxaXcvQ"

app = Flask(__name__)
app.register_blueprint(main_routes)
app.register_blueprint(RecommendController, url_prefix='/api/v1')

app.register_blueprint(WineDetectionController, url_prefix='/api/v1/wine')

# Roboflow API 키 설정


if __name__ == '__main__':
    app.debug = True
    app.run(use_reloader=False)