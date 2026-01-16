from top2vec import Top2Vec
from sklearn.datasets import fetch_20newsgroups
import umap
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import normalize
import re
import nltk
from nltk.corpus import stopwords
nltk.download('stopwords')
stop_words = stopwords.words('english')

output_file = "20newsgroups_data.txt"
newsgroups = fetch_20newsgroups(subset='all', remove=('headers', 'footers', 'quotes'))

with open(output_file, "w", encoding="utf-8") as f:
    for doc in newsgroups.data:
        f.write(doc + "\n")

noise_words = ['uh', 'um', 'so', 'er', 'ah', 'yeah', 'em', 'oh', 'hm', 'he', 'but', 'and', 'th', 'we', 'for', 'ye', 'af', 'she', 'good', 'of', 'my', 've', 'its', 'that', 'da', 'ok', 'ad', 'eh', 'son', 'ya', 'okay', 'they', 'lo', 'as', 'im', 'says', 'ho', 'now', 'this', 'huh', 'hey', 'isn', 'then', 'their', 'great', 'initially', 'excellent', 'it', 'mon', 'right']
# pattern = re.compile(r'\b(' + '|'.join(noise_words) + r')\b', re.IGNORECASE)
# pattern = re.compile(r'\b(' + '|'.join(stop_words) + r')\b', re.IGNORECASE)

# Remove noise words from documents
# cleaned_docs = [pattern.sub('', doc) for doc in newsgroups.data]

# クラスタリング設定
hdbscan_args = {
    'min_cluster_size': 15,
    'metric': 'euclidean',
    'cluster_selection_method': 'eom'
}
model = Top2Vec(documents=newsgroups.data, speed="deep-learn", workers=8, embedding_model="doc2vec", hdbscan_args=hdbscan_args)

# model = Top2Vec.load("top2vec_20newsgroups_model_orig")
model.save("top2vec_20newsgroups_model")
topic_sizes, topic_nums = model.get_topic_sizes()

topic_words, word_scores, topic_nums = model.get_topics(model.get_num_topics())
# print(topic_words[5])
model.save("top2vec_20newsgroups_model_orig")

all_topic_words, _, all_topic_nums = model.get_topics()
print("All Topics:")
for topic, num, size in zip(all_topic_words, all_topic_nums, topic_sizes):
    print(f"Topic {num}: {topic[:10]}, size: {size}")
num_topics = model.get_num_topics()

umap_args = {
    "n_neighbors": 15,
    "n_components": 2,
    "metric": "cosine",
    "verbose": True
}
topic_vectors_300d = model.topic_vectors
# document_vectors_300d = model.document_vectors
topic_vectors_2d = umap.UMAP(**umap_args).fit_transform(topic_vectors_300d)
# document_vectors_20d = umap.UMAP(**umap_args).fit_transform(document_vectors_300d)

coor_2d = topic_vectors_2d[:,0], topic_vectors_2d[:,1]
plt.figure(figsize=(15, 12))
plt.scatter(coor_2d[0], coor_2d[1], s=20, alpha=0.7, c='blue')

for i in range(num_topics):
    topic_label  = "_".join(topic_words[i][:3]) 

    plt.text(
        coor_2d[0][i], coor_2d[1][i], 
        topic_label,
        fontsize=9, 
        fontweight='bold', 
        ha='center', va='center',
        bbox=dict(facecolor='white', alpha=0.6, edgecolor='black', boxstyle='round,pad=0.3')
    )

plt.savefig("20newsgroups_map.png", dpi=300)
