from flask import Blueprint, render_template

main_routes = Blueprint('main_routes', __name__)

@main_routes.route("/")
def home():
    return render_template('html/index.html')

@main_routes.route("/login")
def login():
    return render_template('html/login.html')

@main_routes.route("/sch_filter")
def sch_filter():
    return render_template('html/sch_filter.html')

@main_routes.route("/chatbot")
def chatbot():
    return render_template('html/chat.html')


@main_routes.route("/post")
def post():
    return render_template('html/Posts.html')
