from flask import Flask
from routes.main_routes import main_routes
from modules.RecommendController import RecommendController
from modules.PostController import PostController

app = Flask(__name__)
app.register_blueprint(main_routes)
app.register_blueprint(RecommendController, url_prefix='/api/v1')  # 주류 추천 api
app.register_blueprint(PostController, url_prefix='/api/v1')  # 주류 추천 api

if __name__ == '__main__':
    app.debug = True
    app.run(use_reloader=False)







## DB 연결을 위한 설정해야 되는 순서...

# ### 환경 변수 설정

# 환경 변수를 설정하는 방법은 운영 체제에 따라 다르지만, 윈도우와 리눅스 모두에서 쉽게 설정할 수 있습니다. 아래에서는 윈도우와 리눅스에서 환경 변수를 설정하는 방법을 설명합니다.

# #### 윈도우에서 환경 변수 설정

# 1. 시스템 환경 변수 편집:
#    - 시작 메뉴에서 "환경 변수"를 검색하고 "시스템 환경 변수 편집"을 선택합니다.
#    - "시스템 속성" 창이 열리면, "고급" 탭에서 "환경 변수(N)..." 버튼을 클릭합니다.

# 2. 새 환경 변수 추가:
#    - "환경 변수" 창에서, "시스템 변수(S)" 섹션의 "새로 만들기(N)..." 버튼을 클릭합니다.
#    - "새 시스템 변수" 창이 열리면, 변수 이름과 변수 값을 입력합니다. 예를 들어:
#      - 변수 이름: DB_HOST
#      - 변수 값: your_host
#    - 동일한 방법으로 DB_USER, DB_PASSWORD, DB_NAME 변수를 각각 설정합니다.

# 3. 설정 확인:
#    - "확인" 버튼을 눌러 모든 창을 닫고 설정을 저장합니다.
#    - 명령 프롬프트를 열고 echo %DB_HOST%를 입력하여 환경 변수가 제대로 설정되었는지 확인합니다.

# #### 리눅스에서 환경 변수 설정

# 1. .bashrc 파일 열기:
#    - 터미널을 열고 홈 디렉토리의 .bashrc 파일을 엽니다.
#      bash
#      nano ~/.bashrc
     
#    - nano 대신 vim 또는 선호하는 텍스트 편집기를 사용할 수 있습니다.

# 2. 환경 변수 추가:
#    - 파일의 끝에 다음 줄을 추가하여 환경 변수를 설정합니다.
#      bash
#      export DB_HOST=your_host
#      export DB_USER=your_user
#      export DB_PASSWORD=your_password
#      export DB_NAME=your_database
     

# 3. 파일 저장 및 변경 사항 적용:
#    - 파일을 저장하고 편집기를 종료합니다 (Ctrl + O -> Enter -> Ctrl + X).
#    - 터미널에서 다음 명령을 실행하여 변경 사항을 적용합니다.
#      bash
#      source ~/.bashrc
     

# 4. 설정 확인:
#    - echo $DB_HOST 명령을 실행하여 환경 변수가 제대로 설정되었는지 확인합니다.

