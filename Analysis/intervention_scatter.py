import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
plt.rcParams['font.family'] = "MS Gothic"

def plot_corrected_intervention_scatter(file_path):
    # CSVデータの読み込み
    df = pd.read_csv(file_path)
    
    # 【ロジック修正】
    # インデックス i の行が「介入結果」である条件：
    # 1つ前のフレーム (i-1) で facilitatorActive が 1 であったこと。
    # これにより「最初の1」は除外され、「最後の1の次の0」が結果に含まれます。
    df['is_result'] = df['facilitatorActive'].shift(1) == 1
    df['is_result'] = df['is_result'].fillna(False)
    
    # データの分離
    intervention_results = df[df['is_result']]
    normal_topics = df[~df['is_result']]

    corr_coef = df['interestSD'].corr(df['interestMean'])
    
    # 近似直線 (y = ax + b) の計算
    x_all = df['interestSD']
    y_all = df['interestMean']
    z = np.polyfit(x_all, y_all, 1) # 1次式でフィッティング
    p = np.poly1d(z)

    plt.figure(figsize=(10, 6))

    plt.xlim(0, x_all.max() + 0.05)
    plt.ylim(0, y_all.max() + 0.05)
    
    # 1. 通常の話題および決定ポイントをプロット
    plt.scatter(normal_topics['interestSD'], normal_topics['interestMean'], 
                color='gray', alpha=0.5, label='通常の話題', s=50)
    
    # 2. 介入結果の話題をプロット
    plt.scatter(intervention_results['interestSD'], intervention_results['interestMean'], 
                color='red', alpha=0.9, label='介入時の話題', 
                s=100, marker='X', edgecolors='black')
    
    # 近似直線のプロット
    x_range = np.linspace(x_all.min(), x_all.max(), 100)
    plt.plot(x_range, p(x_range), color='blue', linestyle='--', linewidth=2, 
             label=f'回帰直線 ($r = {corr_coef:.3f}$)')
    
    plt.xlim(0, 0.25)
    plt.ylim(0, 0.4)
    
    plt.tick_params(axis='both', which='major', labelsize=18)

    # グラフの装飾
    plt.xlabel('興味度分散', fontsize=22)
    plt.ylabel('興\n味\n度\n平\n均', rotation=0, labelpad=20, fontsize=22, va='center')

    plt.grid(True, linestyle='--', alpha=0.7)
    
    # 画像の保存
    save_name = file_path.replace('.csv', '_intervention_scatter.png')
    plt.savefig(save_name, dpi=400)
    plt.show()

# 実行
plot_corrected_intervention_scatter('v02ga1.csv')
plot_corrected_intervention_scatter('v02ga25.csv')
plot_corrected_intervention_scatter('v02ga4.csv')
plot_corrected_intervention_scatter('v03ga1.csv')
plot_corrected_intervention_scatter('v03ga25.csv')
plot_corrected_intervention_scatter('v03ga4.csv')
plot_corrected_intervention_scatter('v035ga1.csv')
plot_corrected_intervention_scatter('v035ga25.csv')
plot_corrected_intervention_scatter('v035ga4.csv')