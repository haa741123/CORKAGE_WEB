from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
import logging
import os

app = Flask(__name__)

# 데이터베이스 설정
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://flaskuser:your_password@localhost/flask_board'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 로깅 설정
log_dir = '/var/www/flask/logs'
if not os.path.exists(log_dir):
    os.makedirs(log_dir, exist_ok=True)
logging.basicConfig(filename=os.path.join(log_dir, 'flask_app.log'), level=logging.DEBUG)

# 모델 정의
class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)

# 데이터베이스 초기화
with app.app_context():
    db.create_all()

@app.route('/post/<int:post_id>')
def show_post(post_id):
    post = Post.query.get_or_404(post_id)
    return render_template('html/post_detail.html', post=post)

@app.route('/')
def home():
    return redirect(url_for('board'))

@app.route('/board')
def board():
    posts = Post.query.all()
    return render_template('html/board.html', posts=posts)

@app.route('/post/new', methods=['GET', 'POST'])
def new_post():
    if request.method == 'POST':
        title = request.form['title']
        content = request.form['content']
        new_post = Post(title=title, content=content)
        db.session.add(new_post)
        db.session.commit()
        return redirect(url_for('board'))
    return render_template('html/post_form.html')

@app.route('/login')
def login():
    return render_template('html/login.html')

@app.route('/sch_filter')
def sch_filter():
    return render_template('html/sch_filter.html')

@app.route('/index')
def index():
    return render_template('html/index.html')

@app.route("/post")
def post():
    return render_template('html/Posts.html')


if __name__ == '__main__':
    app.debug = True
    app.run(use_reloader=False)
