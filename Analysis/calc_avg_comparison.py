import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
plt.rcParams['font.family'] = "MS Gothic"


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
    x_labels = ['介入前', '介入後']
    x_pos = [0, 1]
    y_values = [grand_start, grand_result]
    
    # 太い一本の線で描画
    plt.plot(x_pos, y_values, marker='o', markersize=12, linewidth=4, color='blue')
    
    # 数値のラベル表示（大きく表示）
    for x, y in zip(x_pos, y_values):
        plt.text(x, y + 0.005, f'{y:.4f}', ha='center', va='bottom', fontweight='bold', fontsize=13)

    plt.xlim(-0.5, 1.5)
    plt.ylim(0.10, 0.35)
    plt.tick_params(axis='y', labelsize=18)
    plt.xticks(x_pos, x_labels, fontsize=22)

    plt.ylabel('興\n味\n度\n平\n均', rotation=0, labelpad=20, fontsize=22, va='center')

    # plt.title(f'介入前後の興味度平均の変化\nFile: {file_path}')
    plt.grid(True, axis='y', linestyle='--', alpha=0.7)
    plt.tight_layout()
    
    # 保存
    save_name = file_path.replace('.csv', '_avg_comparison.png')
    plt.savefig(save_name, dpi=400)
    plt.show()

# 実行
plot_global_intervention_impact('v02ga1.csv')
plot_global_intervention_impact('v02ga25.csv')
plot_global_intervention_impact('v02ga4.csv')
plot_global_intervention_impact('v03ga1.csv')
plot_global_intervention_impact('v03ga25.csv')
plot_global_intervention_impact('v03ga4.csv')
plot_global_intervention_impact('v035ga1.csv')
plot_global_intervention_impact('v035ga25.csv')
plot_global_intervention_impact('v035ga4.csv')