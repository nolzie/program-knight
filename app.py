from flask import Flask, render_template, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

def load_exercises():
    exercises_path = os.path.join(os.path.dirname(__file__), 'exercises.json')
    with open(exercises_path, 'r') as f:
        return json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/exercises')
def get_exercises():
    exercises = load_exercises()
    return jsonify(exercises)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
