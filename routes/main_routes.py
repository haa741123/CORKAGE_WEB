from flask import Blueprint, render_template

main_routes = Blueprint('main_routes', __name__)

# 로그인 화면 페이지
@main_routes.route("/login")
def login():
    return render_template('html/login.html')

# 홈화면
@main_routes.route("/")
def home():
    return render_template('html/index.html')

# 필터 페이지
@main_routes.route("/sch_filter")
def sch_filter():
    return render_template('html/sch_filter.html')

# 챗봇 페이지
@main_routes.route("/chatbot")
def chatbot():
    return render_template('html/chat.html')

# 게시물 페이지
@main_routes.route("/post")
def post():
    return render_template('html/Posts.html')

# 게시물 작성 및 수정
@main_routes.route("/edit_post")
def edit_post():
    return render_template('html/edit_post.html')

# 마이페이지
@main_routes.route("/mypage")
def edit_post():
    return render_template('html/mypage.html')


# 에러 페이지
@main_routes.errorhandler(404)
def page_not_found(e):
    return render_template('html/error.html'), 404