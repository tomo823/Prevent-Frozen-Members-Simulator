import numpy as np
import matplotlib.pyplot as plt

def generate_profile_vector(dim=20):
    """
    指定された分布(主要:45-60%, 副次:15-27%, その他)を持つ正規化ベクトルを生成
    """
    vec = np.zeros(dim)
    indices = np.random.permutation(dim)
    
    # 1. 主要興味の設定 (45% - 60%)
    primary_val = np.random.uniform(0.45, 0.60)
    vec[indices[0]] = primary_val
    
    # 2. 副次興味の設定 (15% - 27%)
    secondary_val = np.random.uniform(0.15, 0.27)
    vec[indices[1]] = secondary_val
    
# 残りの18次元に2-10%をランダムに割り当て
    for i in range(2, dim):
        vec[indices[i]] = np.random.uniform(0.02, 0.10)
    
    vec = vec / np.sum(vec)
    vec = vec / np.linalg.norm(vec)
    return vec

# シミュレーション設定
n_simulations = 10000
scores_diff = []
user1_scores = []
user2_scores = []

for _ in range(n_simulations):
    # ユーザー1, ユーザー2, および話題のベクトルを生成
    u1 = generate_profile_vector()
    u2 = generate_profile_vector()
    topic = generate_profile_vector()
    
    # 興味スコア (内積) を計算
    s1 = np.dot(u1, topic)
    s2 = np.dot(u2, topic)
    
    user1_scores.append(s1)
    user2_scores.append(s2)
    scores_diff.append(abs(s1 - s2))

# 統計分析
diff_array = np.array(scores_diff)
mean_diff = np.mean(diff_array)
std_diff = np.std(diff_array)
max_diff = np.max(diff_array)
min_diff = np.min(diff_array)

print(f"--- 興味スコア差の統計的分析 ({n_simulations}回試行) ---")
print(f"平均的なスコア差: {mean_diff:.4f}")
print(f"スコア差の標準偏差: {std_diff:.4f}")
print(f"最大のスコア差: {max_diff:.4f}")
print(f"最小のスコア差: {min_diff:.4f}")

# 可視化
plt.figure(figsize=(10, 6))
plt.hist(diff_array, bins=50, color='teal', alpha=0.7, edgecolor='black')
plt.axvline(mean_diff, color='red', linestyle='dashed', linewidth=2, label=f'Mean: {mean_diff:.4f}')
plt.title("Distribution of Interest Score Difference between Two Users")
plt.xlabel("Absolute Difference in Score")
plt.ylabel("Frequency")
plt.legend()
plt.grid(axis='y', alpha=0.3)
plt.show()