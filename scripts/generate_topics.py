import numpy as np
import json
import os
from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import HDBSCAN
import umap

# --- 設定項目 (先行研究のパラメータに準拠) ---
CONFIG = {
    "output_dir": "../data/topics",
    "output_file": "topics.json",
    "num_topics": 20,
    "target_dims": 20,
    "max_features": 5000,
    "random_seed": 42,
    "min_cluster_size": 15
}

def normalize_vector(v):
    """ベクトルを正の値に変換し、合計が1になるよう正規化する"""
    v_min = v.min()
    v_shifted = v - v_min 
    return (v_shifted / (v_shifted.sum() + 1e-9)).tolist()

def generate_topic_data():
    # 1. データロード
    print(f"Step 1: Loading 20 Newsgroups dataset...")
    newsgroups = fetch_20newsgroups(subset='all', remove=('headers', 'footers', 'quotes'))
    category_names = newsgroups.target_names

    # 2. ベクトル化
    print(f"Step 2: Vectorizing documents (TF-IDF)... Dimension: {CONFIG['max_features']}")
    vectorizer = TfidfVectorizer(max_features=CONFIG['max_features'], stop_words='english')
    X = vectorizer.fit_transform(newsgroups.data)

    # 3. 20次元への圧縮
    print(f"Step 3: UMAP Reduction to {CONFIG['target_dims']}d...")
    reducer_20d = umap.UMAP(
        n_components=CONFIG['target_dims'], 
        random_state=CONFIG['random_seed'], 
        metric='cosine'
    )
    X_20d = reducer_20d.fit_transform(X)

    # 4. クラスタリング
    print(f"Step 4: Clustering with HDBSCAN (min_size={CONFIG['min_cluster_size']})...")
    clusterer = HDBSCAN(min_cluster_size=CONFIG['min_cluster_size'], metric='euclidean')
    cluster_labels = clusterer.fit_predict(X_20d)

    # 5. トピック抽出とラベル付与
    print(f"Step 5: Extracting and Labeling Topics...")
    unique_labels = sorted(list(set(cluster_labels) - {-1}))[:CONFIG['num_topics']]
    topic_data = []

    for label in unique_labels:
        mask = (cluster_labels == label)
        # 最も頻度の高い元カテゴリ名を特定
        most_frequent_cat_idx = np.bincount(newsgroups.target[mask]).argmax()
        
        topic_data.append({
            "id": int(label),
            "name": category_names[most_frequent_cat_idx],
            "vector": normalize_vector(X_20d[mask].mean(axis=0)),
            "grid_pos": None 
        })

    # 6. 2次元座標の生成 (タイル配置用)
    print("Step 6: Generating 2D Coordinates for Layout...")
    vectors_for_2d = np.array([t["vector"] for t in topic_data])
    mapper_2d = umap.UMAP(
        n_components=2, 
        n_neighbors=5, 
        min_dist=0.5, 
        random_state=CONFIG['random_seed']
    )
    coords_2d = mapper_2d.fit_transform(vectors_for_2d)

    for i, t in enumerate(topic_data):
        t["grid_pos"] = coords_2d[i].tolist()

    # 7. 保存
    save_path = os.path.join(CONFIG['output_dir'], CONFIG['output_file'])
    os.makedirs(CONFIG['output_dir'], exist_ok=True)
    
    with open(save_path, 'w', encoding='utf-8') as f:
        json.dump(topic_data, f, indent=4, ensure_ascii=False)

    print(f"\nSuccess! File saved at: {save_path}")
    print(f"Total Topics generated: {len(topic_data)}")

if __name__ == "__main__":
    generate_topic_data()