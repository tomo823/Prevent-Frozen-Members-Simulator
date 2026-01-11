# For visualizing

import json
from top2vec import Top2Vec
from sklearn.datasets import fetch_20newsgroups
import numpy as np
import matplotlib.pyplot as plt
from openTSNE import TSNE

# 1. データのロード
print("Loading data...")
newsgroups = fetch_20newsgroups(subset='all', remove=('headers', 'footers', 'quotes'))
documents = newsgroups.data

# 2. Top2Vecモデルの学習
# speed='learn' は高品質な埋め込みを作成します。
# workers は CPU コア数に合わせて調整してください。
print("Training Top2Vec model (this may take a while)...")
model = Top2Vec(documents, speed='learn', workers=8)

# 3. トピック数の確認
num_topics = model.get_num_topics()
print(f"Number of topics found: {num_topics}")

# 4. 意味空間の2次元可視化 (t-SNEを使用)
# Top2Vecには標準で可視化の準備を整える機能があります
print("Reducing dimensions for visualization...")
# model.topic_vectors を使うことで、各トピックの「代表ベクトル」を取得可能
topic_vectors = model.topic_vectors

# 5. 全ドキュメントの座標計算（Top2Vecの内部埋め込みを利用）
# Top2Vecは内部でUMAPを使っていますが、ここでは明示的にプロットします
document_vectors = model.document_vectors  # Doc2Vecで生成されたベクトル

tsne = TSNE(metric="cosine", n_jobs=-1, random_state=42)
X_2d = tsne.fit(document_vectors)

# 6. 可視化：ドキュメントとトピックの中央値
plt.figure(figsize=(15, 12))
plt.scatter(X_2d[:, 0], X_2d[:, 1], s=1, alpha=0.2, c='gray')

topic_data = []
# 各トピック（Top2Vecが自動で見つけたグループ）の代表点にラベルを配置
topic_words, word_scores, topic_nums = model.get_topics()

for i in range(min(20, num_topics)):  # 上位20トピックを表示
    # そのトピックに属するドキュメントの座標の中央値を計算
    doc_indices = model.search_documents_by_topic(topic_num=i, num_docs=100)[2]
    median_pos = np.median(X_2d[doc_indices], axis=0)
    
# 2. JSON用のデータ構造作成
    topic_entry = {
        "id": int(i),
        "name": "_".join(topic_words[i][:3]), # 上位3単語を連結して名前に
        "x": float(median_pos[0]),
        "y": float(median_pos[1]),
        "vector": model.topic_vectors[i].tolist() # 興味計算に使う高次元ベクトル
    }
    topic_data.append(topic_entry)

# JSONファイルとして保存
with open('topics.json', 'w') as f:
    json.dump(topic_data, f, indent=4)

plt.title("Top2Vec + t-SNE: 20 Newsgroups Topic Mapping")
plt.savefig("top2vec_map.png", dpi=300)
plt.show()