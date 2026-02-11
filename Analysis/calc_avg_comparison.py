import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

def plot_global_intervention_impact(file_path):
    df = pd.read_csv(file_path)
    
    # 1. 介入が行われているすべてのインデックスを抽出
    itv_indices = df[df['facilitatorActive'] == 1].index
    
    starts = []
    results = []
    
    # 2. 全介入ステップの「開始」と「結果」を一つのプールに集める
    for idx in itv_indices:
        if idx + 1 < len(df):
            starts.append(df.loc[idx, 'interestMean'])
            results.append(df.loc[idx + 1, 'interestMean'])
            
    # 3. プール全体の平均（Grand Average）を算出
    grand_start = np.mean(starts)
    grand_result = np.mean(results)
    
    # --- 折れ線グラフの描画 ---
    plt.figure(figsize=(6, 6))
    x_labels = ['Total Grand Start', 'Total Grand Result']
    x_pos = [0, 1]
    y_values = [grand_start, grand_result]
    
    # 太い一本の線で描画
    plt.plot(x_pos, y_values, marker='o', markersize=12, linewidth=4, color='blue')
    
    # 数値のラベル表示（大きく表示）
    for x, y in zip(x_pos, y_values):
        plt.text(x, y + 0.005, f'{y:.4f}', ha='center', va='bottom', fontweight='bold', fontsize=12)

    plt.xticks(x_pos, x_labels, fontsize=11)
    plt.ylabel('Average Group Interest Mean', fontsize=11)
    plt.title(f'Global Intervention Impact (Aggregated)\nFile: {file_path}')
    plt.grid(True, axis='y', linestyle='--', alpha=0.7)
    plt.xlim(-0.5, 1.5)
    plt.ylim(min(y_values) - 0.05, max(y_values) + 0.05)
    plt.tight_layout()
    
    # 保存
    save_name = file_path.replace('.csv', '_avg_comparison.png')
    plt.savefig(save_name)
    plt.show()

# 実行
plot_global_intervention_impact('v03ga4_1.csv')
# plot_global_intervention_impact('v03ga4_2.csv')
# plot_global_intervention_impact('v03ga4_3.csv')
plot_global_intervention_impact('v03ga4_4.csv')