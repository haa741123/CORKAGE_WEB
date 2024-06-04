from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template('/html/index.html') # render_template에서 이미 template 폴더 주시중이라 경로에 template 폴더 넣을 필요 없음

@app.route("/login")
def login():
    return render_template('/html/login.html')

if __name__ == '__main__':
    app.debug = True
    app.run()
