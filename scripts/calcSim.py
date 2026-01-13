import json
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

def calculate_topic_similarity_matrix(json_file):
    # 1. JSONファイルの読み込み
    with open(json_file, 'r', encoding='utf-8') as f:
        topic_data = json.load(f)
    
    # 2. 名前とベクトルの抽出
    names = [t['name'] for t in topic_data]
    vectors = np.array([t['vector'] for t in topic_data])

    # 3. sklearnを用いてコサイン類似度行列を計算
    # vectorsの各行を正規化して内積を計算する処理が一括で行われます
    similarity_matrix = cosine_similarity(vectors)

    # 4. 可読性のためにpandasのDataFrameに変換
    df_similarity = pd.DataFrame(similarity_matrix, index=names, columns=names)

    return df_similarity

# --- 実行例 ---
file_path = 'topics.json'
try:
    similarity_df = calculate_topic_similarity_matrix(file_path)
    
    # 結果の表示（小数点以下4桁）
    print("=== 話題間のコサイン類似度行列 ===")
    print(similarity_df.round(4))
    
    # CSVとして保存したい場合
    # similarity_df.to_csv('topic_similarity_matrix.csv')
    
except FileNotFoundError:
    print(f"エラー: {file_path} が見つかりません。")