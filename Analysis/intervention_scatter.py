import pandas as pd
import matplotlib.pyplot as plt

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
    
    # 散布図の作成
    plt.figure(figsize=(10, 6))
    
    # 1. 通常の話題および決定ポイントをプロット
    plt.scatter(normal_topics['interestSD'], normal_topics['interestMean'], 
                color='gray', alpha=0.5, label='Normal Topics / Decision Points', s=50)
    
    # 2. 介入結果の話題をプロット
    plt.scatter(intervention_results['interestSD'], intervention_results['interestMean'], 
                color='red', alpha=0.9, label='Intervention Result Topics', 
                s=100, marker='X', edgecolors='black')
    
    # グラフの装飾
    plt.xlabel('Interest Standard Deviation (SD)')
    plt.ylabel('Group Interest Mean')
    plt.title(f'Interest Mean vs. SD: Intervention Results vs. Others\n({file_path})')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # 画像の保存
    save_name = file_path.replace('.csv', '_intervention_scatter.png')
    plt.savefig(save_name)
    plt.show()

# 実行
plot_corrected_intervention_scatter('v02ga25.csv')
plot_corrected_intervention_scatter('v02ga4.csv')
plot_corrected_intervention_scatter('v03ga1.csv')
plot_corrected_intervention_scatter('v03ga25.csv')
plot_corrected_intervention_scatter('v03ga4.csv')
plot_corrected_intervention_scatter('v035ga1.csv')
plot_corrected_intervention_scatter('v035ga25.csv')
plot_corrected_intervention_scatter('v035ga4.csv')