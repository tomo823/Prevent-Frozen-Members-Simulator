import json
import matplotlib.pyplot as plt
import os

# --- 設定項目 ---
CONFIG = {
    "input_json": "../data/topics/topics.json",
    "output_dir": "../data/plots",
    "output_name": "topic_layout_labeled.png",
    "plot_style": {
        "figsize": (12, 10),
        "dot_color": "royalblue",
        "bg_color": "#f9f9f9",
        "grid_alpha": 0.4
    }
}

def load_topic_data(path):
    """JSONデータをロードする"""
    if not os.path.exists(path):
        raise FileNotFoundError(f"'{path}' が見つかりません。先に generate_topics.py を実行してください。")
    
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def plot_topics(topics):
    """話題データを2次元プロットして保存する"""
    style = CONFIG["plot_style"]
    
    # 1. データの抽出
    names = [t['name'] for t in topics]
    x_coords = [t['grid_pos'][0] for t in topics]
    y_coords = [t['grid_pos'][1] for t in topics]

    # 2. 描画キャンバスの生成
    fig, ax = plt.subplots(figsize=style["figsize"])
    ax.set_facecolor(style["bg_color"])

    # 3. 散布図のプロット
    ax.scatter(x_coords, y_coords, s=150, c=style["dot_color"], alpha=0.7, edgecolors='white', zorder=3)

    # 4. ラベル（注釈）の付与
    for i, name in enumerate(names):
        ax.annotate(
            name, 
            (x_coords[i], y_coords[i]),
            xytext=(8, 8), 
            textcoords='offset points',
            fontsize=10,
            fontweight='bold',
            alpha=0.8,
            zorder=4
        )

    # 5. グラフ装飾
    ax.set_title('2D Projection of 20 Newsgroups Topics (UMAP)', fontsize=16, pad=20)
    ax.set_xlabel('Semantic Dimension X', fontsize=12)
    ax.set_ylabel('Semantic Dimension Y', fontsize=12)
    ax.grid(True, linestyle='--', alpha=style["grid_alpha"], zorder=0)

    # 6. 保存処理
    os.makedirs(CONFIG["output_dir"], exist_ok=True)
    output_path = os.path.join(CONFIG["output_dir"], CONFIG["output_name"])
    
    plt.savefig(output_path, bbox_inches='tight', dpi=150)
    plt.close() # メモリ解放
    print(f"Success! 可視化画像を '{output_path}' として保存しました。")

if __name__ == "__main__":
    try:
        data = load_topic_data(CONFIG["input_json"])
        plot_topics(data)
    except Exception as e:
        print(f"Error: {e}")