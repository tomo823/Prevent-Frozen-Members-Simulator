import json
import numpy as np
import matplotlib.pyplot as plt
import umap
from top2vec import Top2Vec
from sklearn.datasets import fetch_20newsgroups
from sklearn.preprocessing import normalize

# 1. データのロード (Personalized for your research project)
print("1. Loading 20 Newsgroups data...")
newsgroups = fetch_20newsgroups(subset='all', remove=('headers', 'footers', 'quotes'))
documents = newsgroups.data
targets = newsgroups.target
target_names = newsgroups.target_names

# 2. Top2Vecモデルの学習
# 内部で明示的に hdbscan を使用する設定にします
print("2. Training Top2Vec model with HDBSCAN...")
# hdbscan_args でクラスタリングの挙動を微調整可能です
model = Top2Vec(
    documents, 
    speed='learn', 
    workers=8,
    hdbscan_args={'min_cluster_size': 15, 'metric': 'euclidean', 'cluster_selection_method': 'eom'},
)

# 3. ドキュメントベクトルのL2正規化
# 内積計算がそのままコサイン類似度になるよう、すべてのベクトル長を1に揃えます
doc_vectors = normalize(model.document_vectors, norm='l2')

# 4. UMAPによる可視化用の2次元座標計算
print("3. Reducing dimensions with UMAP for visualization...")
reducer = umap.UMAP(n_components=2, metric='cosine', random_state=42)
X_2d = reducer.fit_transform(doc_vectors)

# 5. 左側の島（構造的ノイズ）を閾値で除外 (x > -40)
valid_mask = X_2d[:, 0] >= -40

# 6. 正解カテゴリに基づく重心計算と可視化
print("4. Extracting original category centroids and plotting...")
plt.figure(figsize=(16, 12), facecolor='white')
colors = plt.cm.get_cmap('tab20', 20)
topic_data_orig = []

for i in range(20):
    # 「カテゴリ i」かつ「有効な領域」のドキュメントを抽出
    mask = (targets == i) & valid_mask
    
    if np.sum(mask) == 0:
        continue
        
    current_color = colors(i)
    category_name = target_names[i]
    
    # 散布図の描画
    plt.scatter(X_2d[mask, 0], X_2d[mask, 1], s=2, alpha=0.4, color=current_color, label=category_name)

    # 2次元空間上の中央値（可視化用座標）
    median_pos = np.median(X_2d[mask], axis=0)
    
    # カテゴリの代表ベクトル（重心）の計算とL2正規化
    # 複数のドキュメントベクトルを平均したあと、再度長さを1にします
    centroid_vector = np.mean(doc_vectors[mask], axis=0)
    centroid_vector = normalize(centroid_vector.reshape(1, -1), norm='l2')[0]
    
    # マップ上にカテゴリラベルを配置
    plt.text(median_pos[0], median_pos[1], category_name, 
             fontsize=9, fontweight='bold', ha='center', va='center',
             bbox=dict(facecolor='white', alpha=0.8, edgecolor=current_color, boxstyle='round,pad=0.2'))
    
    # JSON用データの作成
    topic_data_orig.append({
        "id": int(i),
        "name": category_name,
        "x": float(median_pos[0]),
        "y": float(median_pos[1]),
        "color": list(current_color[:3]),
        "vector": centroid_vector.tolist()
    })

# 7. ファイルの保存
output_json = 'topics_orig_hdbscan_l2.json'
output_png = 'top2vec_umap_hdbscan_map.png'

with open(output_json, 'w', encoding='utf-8') as f:
    json.dump(topic_data_orig, f, indent=4, ensure_ascii=False)

plt.title("20 Newsgroups: Optimized Topic Map (Top2Vec + UMAP + HDBSCAN)", fontsize=16)
plt.axis('off')
plt.savefig(output_png, dpi=300, bbox_inches='tight')

print(f"Successfully saved {output_json} and {output_png}")
print(f"Processing complete for {np.sum(valid_mask)} valid documents.")
plt.show()