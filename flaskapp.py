from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def home():
    return render_template('html/index.html')


@app.route("/login")
def login():
    return render_template('html/login.html')


@app.route("/sch_filter")
def sch_filter():
    return render_template('html/sch_filter.html')


if __name__ == '__main__':
    app.debug = True
    app.run(use_reloader=False)
