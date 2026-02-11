import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

def plot_intervention_grand_average(file_path):
    df = pd.read_csv(file_path)
    
    # 介入の連続ブロック（セッション）を特定
    df['is_start'] = (df['facilitatorActive'] == 1) & (df['facilitatorActive'].shift(1) == 0)
    start_indices = df[df['is_start']].index
    
    grand_summary = []
    
    for i, start_idx in enumerate(start_indices):
        # 1. セッションの終端を探す
        end_search = df.loc[start_idx:, 'facilitatorActive']
        zero_indices = end_search[end_search == 0].index
        end_idx = zero_indices[0] if not zero_indices.empty else df.index[-1]
        
        # 2. セッション内の各ステップについて Start(Si) と Result(Ri) を収集
        #    Si: そのフレームの興味度, Ri: 次のフレームの興味度
        session_starts = []
        session_results = []
        
        for idx in range(start_idx, end_idx):
            session_starts.append(df.loc[idx, 'interestMean'])
            session_results.append(df.loc[idx + 1, 'interestMean'])
            
        # 3. セッション内の全ステップを平均化して「この介入の代表値」とする
        grand_start = np.mean(session_starts)
        grand_result = np.mean(session_results)
        
        grand_summary.append({
            'Event': f'#{i+1}',
            'Grand_Start': grand_start,
            'Grand_Result': grand_result
        })

    res_df = pd.DataFrame(grand_summary)
    
    # --- 折れ線グラフの描画 ---
    plt.figure(figsize=(8, 6))
    x_labels = ['Grand Start (Avg Si)', 'Grand Result (Avg Ri)']
    x_pos = [0, 1]
    
    for _, row in res_df.iterrows():
        y_values = [row['Grand_Start'], row['Grand_Result']]
        plt.plot(x_pos, y_values, marker='o', label=f"Intervention {row['Event']}")
        # 数値の注釈
        for x, y in zip(x_pos, y_values):
            plt.text(x, y + 0.002, f'{y:.3f}', ha='center', va='bottom')

    plt.xticks(x_pos, x_labels)
    plt.ylabel('Group Interest Mean (Grand Average)')
    plt.title(f'Intervention Impact: Step-wise Grand Average\n({file_path})')
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.grid(True, axis='y', linestyle='--', alpha=0.6)
    plt.xlim(-0.5, 1.5)
    plt.tight_layout()
    
    # 保存
    save_name = file_path.replace('.csv', '_sequence_avg_comparison.png')
    plt.savefig(save_name)
    plt.show()

# 実行
plot_intervention_grand_average('v02ga4.csv')