import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

def analyze_realistic_purity(json_file):
    # 1. データの読み込み
    with open(json_file, 'r', encoding='utf-8') as f:
        topic_data = json.load(f)
    
    names = [t['name'] for t in topic_data]
    vectors = np.array([t['vector'] for t in topic_data])
    print(topic_data[19])  # デバッグ用
    n_topics = len(vectors)
    dim = len(vectors[0])

    # 2. 「現実的理想行列」の作成 (52%, 21%, Others)
    ideal_matrix = np.zeros((n_topics, dim))
    for i in range(n_topics):
        ideal_matrix[i, i] = 0.52  # 主要
        ideal_matrix[i, (i + 1) % dim] = 0.21  # 副次（隣の次元へ）
    
    # 残りの18次元に分配
        other_indices = [idx for idx in range(dim) if idx != i and idx != (i + 1) % dim]
        for idx in other_indices:
            ideal_matrix[i, idx] = 0.6
            
    # L2正規化
    ideal_matrix = normalize(ideal_matrix, norm='l2')
    actual_vectors = normalize(vectors, norm='l2')

    print(ideal_matrix[19])  # デバッグ用
    print(actual_vectors[19])  # デバッグ用

    # 3. 類似度（適合度）の計算
    # 各話題ベクトルが、自身の理想的な「山」の形とどれだけ似ているか
    fit_scores = []
    for i in range(n_topics):
        score = np.dot(actual_vectors[i], ideal_matrix[i])
        fit_scores.append(score)

    # 4. 統計まとめ
    df_result = pd.DataFrame({
        'Topic': names,
        'Ideal_Fit_Score': fit_scores
    }).sort_values('Ideal_Fit_Score', ascending=False)

    print("=== Realistic Ideal Fit Analysis ===")
    print(f"平均適合度 (Avg Fit): {np.mean(fit_scores):.4f}")
    print(f"最も理想に近い話題: {df_result.iloc[0]['Topic']} ({df_result.iloc[0]['Ideal_Fit_Score']:.4f})")
    print(f"最も乖離している話題: {df_result.iloc[-1]['Topic']} ({df_result.iloc[-1]['Ideal_Fit_Score']:.4f})")

    # 5. 可視化
    plt.figure(figsize=(12, 6))
    plt.bar(df_result['Topic'], df_result['Ideal_Fit_Score'], color='mediumseagreen')
    plt.axhline(y=np.mean(fit_scores), color='red', linestyle='--', label=f'Average: {np.mean(fit_scores):.2f}')
    plt.xticks(rotation=90)
    plt.ylabel("Cosine Similarity to Ideal Profile")
    plt.title("How well do current topics match the 52/21/27 distribution?")
    plt.tight_layout()
    plt.show()

    return df_result

analyze_realistic_purity('../data/topics/topics.json')