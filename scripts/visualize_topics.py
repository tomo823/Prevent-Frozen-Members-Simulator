import json
import matplotlib.pyplot as plt
import os

# 1. データの読み込み
# ディレクトリ構造に合わせてパスを調整
json_path = '../data/topics.json'
if not os.path.exists(json_path):
    print(f"Error: {json_path} が見つかりません。")
    print("先に generate_topics.py を実行してデータを生成してください。")
    exit()

with open(json_path, 'r', encoding='utf-8') as f:
    topics = json.load(f)

# 2. データの抽出
# 各トピックのカテゴリ名、X座標、Y座標をリスト化
names = [t['name'] for t in topics]
x_coords = [t['grid_pos'][0] for t in topics]
y_coords = [t['grid_pos'][1] for t in topics]

# 3. 描画の設定
plt.figure(figsize=(12, 10))
# 点の色をカテゴリごとに変えたい場合は、ここを調整（今回はシンプルに青）
plt.scatter(x_coords, y_coords, s=150, c='royalblue', alpha=0.7, edgecolors='white')

# 4. 各点にトピック名（先行研究カテゴリ名）を注釈
for i, name in enumerate(names):
    plt.annotate(
        name, 
        (x_coords[i], y_coords[i]),
        xytext=(8, 8), 
        textcoords='offset points',
        fontsize=10,
        fontweight='bold',
        alpha=0.8
    )

# 5. グラフの装飾（論文の Figure 4 を意識）
plt.title('2D Projection of 20 Newsgroups Topics (UMAP)', fontsize=16, pad=20)
plt.xlabel('Semantic Dimension X', fontsize=12)
plt.ylabel('Semantic Dimension Y', fontsize=12)
plt.grid(True, linestyle='--', alpha=0.4)

# 背景色を少しグレーにするとタイルの雰囲気が出ます
plt.gca().set_facecolor('#f9f9f9')

# 6. 画像として保存
output_image = '../data/plots/topic_layout_labeled.png'
plt.savefig(output_image, bbox_inches='tight', dpi=150)
print(f"Success! 可視化画像を '{output_image}' として保存しました。")