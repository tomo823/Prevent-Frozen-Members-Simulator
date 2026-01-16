from pydoc_data.topics import topics
import matplotlib
import pandas as pd
import numpy as np
import os
import matplotlib.pyplot as plt
from bertopic import BERTopic
from umap import UMAP
from sklearn.datasets import fetch_20newsgroups

class TopicVectorPipeline:
    def __init__(self):
        self.model = None
        self.doc_vectors_300d = None
        self.num_topics = 0
        self.topic_words = []
        self.topic_nums = []
        self.docs = None
# --- データの読み込み部分のみ抜粋 ---

    def fetch_dataset(self, csv_path="test.csv"):
        """
        DailyDialogのCSVから会話文を抽出する。
        """  
        self.docs = fetch_20newsgroups(subset='all',  remove=('headers', 'footers', 'quotes'))['data']

    def _run_training_flow(self, csv_path="test.csv"):
        print("Starting training pipeline with DailyDialog...")
        
        # 1. CSVからデータ取得        
        # 2. 前処理 (ノイズ単語の除去など)
        # cleaned_data = self._preprocess_text(raw_data)
        
        # 3. 学習実行
        print("Training BERTopic model...")
        topic_model = BERTopic()
        topics, _ = topic_model.fit_transform(self.docs)

        self.model = topic_model
        print(self.model.visualize_topics())
        # 4. 保存
        self.model.save("bertopic_dailydialog_model")
        self.doc_vectors_300d = self.model._extract_embeddings(self.docs, method="document")
        vector_2d = UMAP(n_neighbors=15, n_components=2, metric='cosine').fit_transform(self.doc_vectors_300d)
        df = pd.DataFrame(vector_2d, columns=["x", "y"])
        df["topic"] = topics

        # Plot parameters
        top_n = 10
        fontsize = 12

        # Slice data
        to_plot = df.copy()
        to_plot[df.topic >= top_n] = -1
        outliers = to_plot.loc[to_plot.topic == -1]
        non_outliers = to_plot.loc[to_plot.topic != -1]

# Visualize topics
        cmap = matplotlib.colors.ListedColormap(['#FF5722', # Red
                                         '#03A9F4', # Blue
                                         '#4CAF50', # Green
                                         '#80CBC4', # FFEB3B
                                         '#673AB7', # Purple
                                         '#795548', # Brown
                                         '#E91E63', # Pink
                                         '#212121', # Black
                                         '#00BCD4', # Light Blue
                                         '#CDDC39', # Yellow/Red
                                         '#AED581', # Light Green
                                         '#FFE082', # Light Orange
                                         '#BCAAA4', # Light Brown
                                         '#B39DDB', # Light Purple
                                         '#F48FB1', # Light Pink
                                         ])

        # Visualize outliers + inliers
        fig, ax = plt.subplots(figsize=(15, 15))
        scatter_outliers = ax.scatter(outliers['x'], outliers['y'], c="#E0E0E0", s=1, alpha=.3)
        scatter = ax.scatter(non_outliers['x'], non_outliers['y'], c=non_outliers['topic'], s=1, alpha=.3, cmap=cmap)

        # Add topic names to clusters
        centroids = to_plot.groupby("topic").mean().reset_index().iloc[1:]
        for row in centroids.iterrows():
            topic = int(row[1].topic)
            text = f"{topic}: " + "_".join([x[0] for x in topic_model.get_topic(topic)[:3]])
            ax.text(row[1].x, row[1].y*1.01, text, fontsize=fontsize, horizontalalignment='center')

        ax.text(0.99, 0.01, f"BERTopic - Top {top_n} topics", transform=ax.transAxes, horizontalalignment="right", color="black")
        plt.xticks([], [])
        plt.yticks([], [])
        plt.show()

    def plot_results(self):
        umap_args = {
            "n_neighbors": 15,
            "n_components": 2,
            "metric": "cosine",
            "verbose": True
        }
        # 可視化コード (前述のものと同じ)
        document_vectors_2d = umap.UMAP(**umap_args).fit_transform(self.doc_vectors_300d)

        coor_2d = document_vectors_2d[:,0], document_vectors_2d[:,1]
        plt.figure(figsize=(15, 12))
        plt.scatter(coor_2d[0], coor_2d[1], s=20, alpha=0.7, c='blue')
        for i in range(self.num_topics):
            topic_label  = "_".join(self.topic_words[i][:3]) 

            plt.text(
                coor_2d[0][i], coor_2d[1][i],
                topic_label,
                fontsize=9
            )


# --- 実行セクション ---
if __name__ == "__main__":
    pipeline = TopicVectorPipeline()
    pipeline.fetch_dataset()
    # 既存モデルがない場合、CSVを指定して学習
    pipeline._run_training_flow("test.csv")
        
    # pipeline.plot_results()
    # pipeline.extract_metadata(num_topics=20)
    # pipeline.save_json("topics_dailydialog.json")