# For vectorizing and topic modeling

import numpy as np
import matplotlib.pyplot as plt
import json
import umap
from sklearn.datasets import fetch_20newsgroups
from top2vec import Top2Vec

# --- 1. データ準備 ---
print("Loading Data...")
newsgroups = fetch_20newsgroups(subset='all', remove=('headers', 'footers', 'quotes'))
model = Top2Vec(newsgroups.data, speed='learn', workers=8)

# --- 2. 上位20トピックの特定 (大きい順) ---
all_topic_sizes, all_topic_nums = model.get_topic_sizes()
# 大きい順にソート（スライス [::-1] を使用）
sorted_topic_nums = all_topic_nums[::-1]
sorted_topic_sizes = all_topic_sizes[::-1]

top_20_indices = sorted_topic_nums[:20]

print(f"Top topic (ID: {top_20_indices[0]}) size: {sorted_topic_sizes[0]}")
print(f"20th topic (ID: {top_20_indices[19]}) size: {sorted_topic_sizes[19]}")

# --- 3. UMAP次元削減 ---
print("Reducing dimensions (2D & 20D)...")
document_vectors = model.document_vectors
X_2d = umap.UMAP(n_components=2, metric='cosine', random_state=42).fit_transform(document_vectors)
X_20d = umap.UMAP(n_components=20, metric='cosine', random_state=42).fit_transform(document_vectors)

# --- 4. 可視化とJSON保存 ---
plt.figure(figsize=(16, 12), facecolor='white')
all_doc_topics, _, _, _ = model.get_documents_topics(list(range(len(newsgroups.data))))

# A. まず背景を描画 (全ドキュメントを薄いグレーで)
plt.scatter(X_2d[:, 0], X_2d[:, 1], c='#e0e0e0', s=1, alpha=0.1, zorder=1)

# B. 上位20トピックを色分けして上書き描画
colors = plt.cm.get_cmap('tab20', 20)
topic_data_for_json = []

for i, t_num in enumerate(top_20_indices):
    mask = (all_doc_topics == t_num)
    current_color = colors(i)
    
    # ここで色分け！所属ドキュメントをトピックごとの色で描画
    plt.scatter(X_2d[mask, 0], X_2d[mask, 1], color=current_color, s=2, alpha=0.6, zorder=2)
    
    # 中央値を計算 (ラベル配置用)
    median_pos_2d = np.median(X_2d[mask], axis=0)
    mean_vec_20d = np.mean(X_20d[mask], axis=0)
    
    # 名前取得
    topic_words, _, _ = model.get_topics()
    topic_name = "_".join(topic_words[t_num][:3])
    
    # ラベルをトピックの色に合わせて配置
    plt.text(median_pos_2d[0], median_pos_2d[1], f"ID {i}: {topic_name}", 
             fontsize=9, fontweight='bold', ha='center', va='center',
             color='black', # 文字は黒
             bbox=dict(facecolor='white', alpha=0.7, edgecolor=current_color, boxstyle='round,pad=0.2'),
             zorder=3)

    topic_data_for_json.append({
        "id": i,
        "size": int(sorted_topic_sizes[i]),
        "name": topic_name,
        "color": list(current_color[:3]), # RGB値を保存（JS側でタイル色に使える）
        "x": float(median_pos_2d[0]),
        "y": float(median_pos_2d[1]),
        "vector": mean_vec_20d.tolist()
    })

plt.title("20 Newsgroups: Top 20 Topics (UMAP Visualization)", fontsize=16)
plt.axis('off')
plt.savefig("top2vec_top20_colored.png", dpi=300, bbox_inches='tight')

with open('topics_top20.json', 'w', encoding='utf-8') as f:
    json.dump(topic_data_for_json, f, indent=4, ensure_ascii=False)

print("Finished! Topics colored and JSON saved.")