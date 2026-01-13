from top2vec import Top2Vec
from sklearn.datasets import fetch_20newsgroups
import umap
import numpy as np
import matplotlib.pyplot as plt
import re

# np.set_printoptions(threshold=np.inf)
newsgroups = fetch_20newsgroups(subset='all', remove=('headers', 'footers', 'quotes'))

noise_words = ['uh', 'um', 'so', 'er', 'ah', 'yeah', 'em', 'oh', 'hm', 'he', 'but', 'and', 'th', 'we', 'for', 'ye', 'af', 'she', 'good', 'of', 'my', 've', 'its', 'that', 'da', 'ok', 'ad', 'eh', 'son', 'ya', 'okay', 'they', 'lo', 'as', 'im', 'says', 'ho', 'now', 'this', 'huh', 'hey', 'isn', 'then', 'their', 'great', 'initially', 'excellent', 'it', 'mon', 'right']
pattern = re.compile(r'\b(' + '|'.join(noise_words) + r')\b', re.IGNORECASE)
cleaned_docs = [pattern.sub('', doc) for doc in newsgroups.data]

# model = Top2Vec(documents=cleaned_docs, speed="deep-learn", workers=8)

model = Top2Vec.load("top2vec_20newsgroups_model_orig")
topic_sizes, topic_nums = model.get_topic_sizes()

topic_words, word_scores, topic_nums = model.get_topics(model.get_num_topics())
model.save("top2vec_20newsgroups_model_orig")

num_topics = model.get_num_topics()

umap_args = {
    "n_neighbors": 15,
    "n_components": 2, # 5 -> 2 for plotting 
    "metric": "cosine",
    "verbose": True
}
vectors = model.topic_vectors
reducer = umap.UMAP(**umap_args).fit_transform(vectors)

coor_2d = reducer[:,0], reducer[:,1]
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

plt.savefig("20newsgroups_map_orig.png", dpi=300)
plt.show()