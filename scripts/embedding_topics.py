import os
import re
import numpy as np
import json
from sklearn.datasets import fetch_20newsgroups
import matplotlib.pyplot as plt
import umap
from sklearn.preprocessing import normalize
from top2vec import Top2Vec

class TopicVectorPipeline:
    """
    Top2Vecモデルからシミュレーション用のトピックデータと地図を生成するパイプライン。
    SRP (単一責任の原則) に基づき、ロード、次元削減、データ抽出、保存の各機能を分離。
    """

    def __init__(self, model_file="top2vec_20newsgroups_model", vector_file="umap_vectors_300d.npy"):
        self.model_file = model_file
        self.vector_file = vector_file
        
        # クラスタリング設定
        self.hdbscan_args = {
            'min_cluster_size': 15,
            'metric': 'euclidean',
            'cluster_selection_method': 'eom'
        }

        print("1. Initializing Data and Model...")
        self.load_or_train_model()
        
        self.X_2d = None
        self.X_20d = None
        self.topic_data = []

# --- 1. エントリポイント (ロジック制御) ---
    def prepare_model(self):
        """
        モデルの準備を行う。ロードを試み、失敗した場合は学習を開始する。
        """
        if os.path.exists(self.model_file):
            self._load_from_disk()
        else:
            print("Model files not found. Starting training pipeline...")
            self._run_training_pipeline()

    def _load_from_disk(self):
            print(f"Loading existing model: {self.model_file}")
            self.model = Top2Vec.load(self.model_file)
            self.doc_vectors_300d = np.load(self.vector_file)

# --- 3. 学習パイプライン (Training) ---
    def _run_training_pipeline(self):
        """データの取得、前処理、学習、保存までを一気に行う内部ワークフロー"""
        # データ取得
        data = self._fetch_raw_data()
        
        # 前処理
        cleaned_data = self._preprocess_text(data)
        
        # 学習
        self._train_model(cleaned_data)
        
        # 学習直後のノイズ確認 (任意)
        self._inspect_noise_topics(keywords=["um"])
        
        # 保存
        self._save_to_disk()
        self.doc_vectors_300d = self.model.document_vectors

    def _fetch_raw_data(self):
        print("Fetching 20newsgroups data...")
        newsgroups = fetch_20newsgroups(subset='all', remove=('headers', 'footers', 'quotes'))
        return newsgroups.data

    def _preprocess_text(self, documents):
        print("Preprocessing text: removing fillers...")
        noise_words = [
                    "um", "er", "oh", "ah", "em", "hm", "yeah", "yep", 
                    "ok", "okay", "huh", "hey", "ya", "lo", "da", "well", "eh"
                ]
        pattern = re.compile(r'\b(' + '|'.join(noise_words) + r')\b', re.IGNORECASE)
        return [pattern.sub('', doc) for doc in documents]

    def _train_model(self, data):
        print("Training Top2Vec model (this may take a while)...")
        self.model = Top2Vec(
            data, 
            speed='learn', 
            workers=8,
            hdbscan_args=self.hdbscan_args,
            token_pattern=r"\b\w{3,}\b" # 3文字以上の制約
        )

    def _inspect_noise_topics(self, keywords=["um"]):
        """学習直後にノイズトピックがないか確認するデバッグ用メソッド"""
        try:
            _, _, _, topic_nums = self.model.search_topics(keywords=keywords, num_topics=2)
            remove_topics = []
            print(f"Inspecting topics related to {keywords}: {topic_nums}")
            for topic in topic_nums:
                self.model.generate_topic_wordcloud(topic)
        except Exception as e:
            print(f"No topics found for inspection: {e}")

    def _save_to_disk(self):
        print(f"Saving model and vectors to disk...")
        self.model.save(self.model_file)
        np.save(self.vector_file, self.model.document_vectors)

    # def load_or_train_model(self):
    #     """モデルが存在すればロード、なければfetchして学習する"""
    #     if os.path.exists(self.model_file):
    #         print(f"Loading existing model: {self.model_file}")
    #         self.model = Top2Vec.load(self.model_file)
    #         self.doc_vectors_300d = np.load(self.vector_file)
    #     else:
    #         print("Model not found. Fetching 20newsgroups and training...")
    #         newsgroups = fetch_20newsgroups(subset='all', remove=('headers', 'footers', 'quotes'))

    #         # テキスト前処理の実行
    #         cleaned_data = self._preprocess_text(newsgroups.data)
            
    #         # 指定されたパラメータで学習実行
    #         self.model = Top2Vec(
    #             cleaned_data, 
    #             speed='learn', 
    #             workers=8,
    #             hdbscan_args=self.hdbscan_args
    #         )

    #         topic_words, word_scores, topic_scores, topic_nums = self.model.search_topics(keywords=["um"], num_topics=2)
    #         remove_topics = []
    #         for topic in topic_nums:
    #             remove_topics.append(self.model.generate_topic_wordcloud(topic))
    #         print(f"Removing noisy topics: {remove_topics}")
            
    #         # モデルとベクトルを保存
    #         self.model.save(self.model_file)
    #         self.doc_vectors_300d = self.model.document_vectors
    #         np.save(self.vector_file, self.doc_vectors_300d)
    #         print(f"Model and vectors saved: {self.model_file}, {self.vector_file}")

    def run_embedding_and_extraction(self, num_topics=20):
        """次元削減を実行し、シミュレーション用のメタデータを抽出する。"""
        self._reduce_dimensions()
        self._extract_topic_metadata(num_topics)

    # --- 4. 責任：次元削減とデータ抽出 (Embedding) ---
    def _reduce_dimensions(self, random_state=42):
        print("Reducing dimensions to 2D and 20D...")
        norm_vectors = normalize(self.doc_vectors_300d, norm='l2')
        
        self.X_2d = umap.UMAP(n_components=2, metric='cosine', random_state=random_state).fit_transform(norm_vectors)
        raw_20d = umap.UMAP(n_components=20, metric='cosine', random_state=random_state).fit_transform(norm_vectors)
        self.X_20d = normalize(raw_20d, norm='l2')

    # def run_umap_reduction(self, random_state=42):
    #     """次元削減の実行。内積計算の精度向上のため事前にL2正規化を適用"""
    #     print("2. Reducing dimensions with UMAP (2D & 20D)...")
        
    #     # 300次元ベクトルを正規化
    #     norm_vectors = normalize(self.doc_vectors_300d, norm='l2')

    #     # 可視化用 (2D)
    #     self.X_2d = umap.UMAP(
    #         n_components=2, metric='cosine', random_state=random_state
    #     ).fit_transform(norm_vectors)

    #     # シミュレーション用 (20D)
    #     # 削減後、再度L2正規化することでJS側の内積をコサイン類似度にする
    #     raw_20d = umap.UMAP(
    #         n_components=20, metric='cosine', random_state=random_state
    #     ).fit_transform(norm_vectors)
    #     self.X_20d = normalize(raw_20d, norm='l2')

    def _extract_topic_metadata(self, num_topics):
        print(f"Extracting metadata for {num_topics} topics...")
        all_topic_sizes, all_topic_nums = self.model.get_topic_sizes()
        all_topic_words, _, _ = self.model.get_topics()
        
        limit = min(num_topics, len(all_topic_nums))
        for i in range(limit):
            t_num = all_topic_nums[i]
            doc_indices = self.model.search_documents_by_topic(topic_num=t_num, num_docs=50)[2]
            
            # 代表点と代表ベクトル
            pos = np.median(self.X_2d[doc_indices], axis=0)
            vec = np.mean(self.X_20d[doc_indices], axis=0)
            vec_l2 = vec / np.linalg.norm(vec)
            
            self.topic_data.append({
                "id": int(t_num),
                "name": "_".join(all_topic_words[t_num][:3]),
                "x": float(pos[0]), "y": float(pos[1]),
                "vector": vec_l2.tolist()
            })

    def extract_top_topics(self):
        num_topics = 20

        """上位トピックの統計情報（名前、中心座標、代表ベクトル）を抽出"""
        # print(f"3. Extracting Metadata for Top {num_topics} Topics...")
        
        all_topic_sizes, all_topic_nums = self.model.get_topic_sizes()
        print(f"   All topic sizes: {all_topic_sizes}")
        all_topic_words, _, _ = self.model.get_topics()

        for i in range(all_topic_nums.shape[0]):
            t_num = all_topic_nums[i]
            
            # トピックを代表するドキュメントのインデックスを取得
            doc_indices = self.model.search_documents_by_topic(topic_num=t_num, num_docs=10)[2]
            
            # 2Dマップ上の座標（中央値）
            median_pos = np.median(self.X_2d[doc_indices], axis=0)
            
            # 20D空間上のベクトル（平均をとり、再度L2正規化）
            centroid_vec = np.mean(self.X_20d[doc_indices], axis=0)
            centroid_vec_l2 = centroid_vec / np.linalg.norm(centroid_vec)
            
            topic_name = "_".join(all_topic_words[t_num][:3])
            
            self.topic_data.append({
                "id": i,
                "name": topic_name,
                "x": float(median_pos[0]),
                "y": float(median_pos[1]),
                "vector": centroid_vec_l2.tolist()
            })

    def save_results(self, json_path, img_path):
        """ファイル出力とプロットの生成。描画ロジックをカプセル化。"""
        print(f"4. Saving Results to {json_path} and {img_path}...")

        # 1. JSON保存
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(self.topic_data, f, indent=4, ensure_ascii=False)

        # 2. 可視化プロット
        plt.figure(figsize=(16, 12), facecolor='white')
        plt.scatter(self.X_2d[:, 0], self.X_2d[:, 1], c='gray', s=1, alpha=0.2)

        for topic in self.topic_data:
            plt.text(
                topic['x'], topic['y'], topic['name'],
                fontsize=9, fontweight='bold', ha='center', va='center',
                bbox=dict(facecolor='white', alpha=0.6, edgecolor='black', boxstyle='round,pad=0.3')
            )

        plt.title("20 Newsgroups: Optimized Topic Map", fontsize=16)
        plt.axis('off')
        plt.savefig(img_path, dpi=300, bbox_inches='tight')
        plt.show()


# --- メイン処理 ---
if __name__ == "__main__":
    # パイプラインの実行
    pipeline = TopicVectorPipeline()
    pipeline.prepare_model()
    pipeline.extract_top_topics()
    pipeline.save_results("umap_opt.json", "umap_opt_map.png")