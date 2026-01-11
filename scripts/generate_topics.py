import numpy as np
import json
import os
from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import HDBSCAN
import umap

# ディレクトリ作成
os.makedirs('../data/topics', exist_ok=True)

print("Step 1: Loading 20 Newsgroups dataset...")
# 論文に基づきメタ情報を削除 [cite: 1061]
newsgroups = fetch_20newsgroups(subset='all', remove=('headers', 'footers', 'quotes'))

print("Step 2: Vectorizing documents (TF-IDF)...")
# 単語の出現頻度により上位5000単語から特徴量を抽出
vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
X = vectorizer.fit_transform(newsgroups.data)

print("Step 3: Dimensionality reduction to 20d (Target Dimensions)...")
# 論文の「20次元」を再現するための次元圧縮
# 乱数調整のためにrandom_stateを42に固定
reducer_20d = umap.UMAP(n_components=20, random_state=42, metric='cosine')
X_20d = reducer_20d.fit_transform(X)

print("Step 4: Clustering with HDBSCAN...")
# 密度ベースで20個以上の潜在トピックを特定 
# 一つのトピックに15個以上の文書が含まれるように設定
clusterer = HDBSCAN(min_cluster_size=15, metric='euclidean')
cluster_labels = clusterer.fit_predict(X_20d)

print("Step 5: Extracting Top 20 Topics with Research Labels...")
# 有効なクラスタから上位20個を選択
unique_labels = sorted(list(set(cluster_labels) - {-1}))[:20]
topic_data = []

# 先行研究のカテゴリ名リストを取得 
category_names = newsgroups.target_names

def normalize_vector(v):
    v_min = v.min()
    v_shifted = v - v_min 
    return (v_shifted / (v_shifted.sum() + 1e-9)).tolist()

for label in unique_labels:
    mask = (cluster_labels == label)
    
    # このトピックに属するドキュメントが、本来どのカテゴリ（ラベル）だったかを集計
    # 論文の Table 1 にあるようなカテゴリ名を特定するため [cite: 451]
    original_categories = newsgroups.target[mask]
    most_frequent_cat_idx = np.bincount(original_categories).argmax()
    assigned_name = category_names[most_frequent_cat_idx]
    
    # 20次元の重心を計算
    centroid_20d = X_20d[mask].mean(axis=0)
    
    topic_data.append({
        "id": int(label),
        "name": assigned_name,  # 'talk.politics.misc' 等の名前が入る 
        "vector": normalize_vector(centroid_20d),
        "grid_pos": None 
    })

print("Step 6: Generating 2D Coordinates for Tile Layout...")
# 20次元の意味的距離を維持したまま、2次元のグリッド座標へ変換
vectors_for_2d = np.array([t["vector"] for t in topic_data])
mapper_2d = umap.UMAP(n_components=2, n_neighbors=5, min_dist=0.5, random_state=42)
coords_2d = mapper_2d.fit_transform(vectors_for_2d)

for i, t in enumerate(topic_data):
    t["grid_pos"] = coords_2d[i].tolist() # シミュレーション上の位置

# JSONファイルとして書き出し
with open('../data/topics/topics.json', 'w', encoding='utf-8') as f:
    json.dump(topic_data, f, indent=4, ensure_ascii=False)

print("\nSuccess! Generated '../data/topics/topics.json'.")
print(f"Total Topics: {len(topic_data)}")