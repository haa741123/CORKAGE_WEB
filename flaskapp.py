from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template('/html/index.html')

@app.route("/login")
def login():
    return render_template('/html/login.html')

if __name__ == '__main__':
    app.debug = True
    app.run()
