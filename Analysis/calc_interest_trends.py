import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
plt.rcParams['font.family'] = "MS Gothic"

def plot_interest_trends_fixed(file_path):
    df = pd.read_csv(file_path)
    # 横軸：0から始まる話題遷移数（インデックス）
    # インデックス9 = CSVの11行目（データ開始から10番目）に対応
    x = np.arange(len(df))
    
    plt.figure(figsize=(12, 6))
    
    # 1. 個人の興味度（色分け＋透明度を調整）
    colors = ['#2ca02c', '#ff7f0e', '#9467bd'] # 緑, オレンジ, 紫
    plt.plot(x, df['m1_interest'], color=colors[0], alpha=0.3, label='参加者1')
    plt.plot(x, df['m2_interest'], color=colors[1], alpha=0.3, label='参加者2')
    plt.plot(x, df['m3_interest'], color=colors[2], alpha=0.3, label='参加者3')
    
    # 2. 興味度平均（太い黒線で最前面に強調）
    plt.plot(x, df['interestMean'], color='black', linewidth=3, label='興味度平均', zorder=5)
    
    # 3. 介入区間の特定と描画（ずれの修正版）
    active = df['facilitatorActive'].values
    padded = np.concatenate(([0], active, [0]))
    diff = np.diff(padded)
    
    starts = np.where(diff == 1)[0]
    ends = np.where(diff == -1)[0]
    
    for s, e in zip(starts, ends):
        # index s から e までの点を含むように ±0.5 の幅で塗りつぶし
        plt.axvspan(s, e, color='red', alpha=0.2, 
                    label='介入区間' if s == starts[0] else "", zorder=1)

    plt.xlabel('話題遷移数', fontsize=22)
    plt.ylabel('興\n味\n度', rotation=0, labelpad=20, fontsize=22, va='center')

    plt.xlim(0, 40)
    plt.ylim(0, 0.6)
    plt.tick_params(axis='both', which='major', labelsize=18)
    
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.legend(loc='upper right')
    
    save_name = file_path.replace('.csv', f'_interest_trends.png')
    plt.savefig(save_name, dpi=400)
    plt.show()

# 実行
plot_interest_trends_fixed('v02ga1.csv')
plot_interest_trends_fixed('v02ga25.csv')
plot_interest_trends_fixed('v02ga4.csv')
plot_interest_trends_fixed('v03ga1.csv')
plot_interest_trends_fixed('v03ga25.csv')
plot_interest_trends_fixed('v03ga4.csv')
plot_interest_trends_fixed('v035ga1.csv')
plot_interest_trends_fixed('v035ga25.csv')
plot_interest_trends_fixed('v035ga4.csv')