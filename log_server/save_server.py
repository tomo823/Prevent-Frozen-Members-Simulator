from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app) # Live Server(5500)からの通信を許可するために必須

# 保存先フォルダ
SAVE_DIR = "logs"
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

@app.route('/save-csv', methods=['POST'])
def save_csv():
    data = request.json
    filename = data.get('filename')
    content = data.get('content')
    
    path = os.path.join(SAVE_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"File saved: {path}")
    return jsonify({"message": "Saved successfully", "path": path})

if __name__ == '__main__':
    app.run(port=5000)