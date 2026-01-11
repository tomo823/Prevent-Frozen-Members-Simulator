import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

file_path = '../data/topics/topics.json'

with open(file_path, 'r') as f:
    data = json.load(f)

# Use the data directly as it's small enough to inline
vectors = np.array([d['vector'] for d in data])
names = np.array([d['name'] for d in data])
n = len(vectors)

pairs_data = []

for i in range(n):
    for j in range(i + 1, n):
        # Cosine Similarity
        vec_a = vectors[i]
        vec_b = vectors[j]
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        
        sim = np.dot(vec_a, vec_b) / (norm_a * norm_b)
        
        is_same_topic = (names[i] == names[j])
        
        pairs_data.append({
            'index_pair': (i, j),
            'name_a': names[i],
            'name_b': names[j],
            'similarity': sim,
            'relationship': 'Same Topic' if is_same_topic else 'Different Topic'
        })

df = pd.DataFrame(pairs_data)

# Calculate statistics
stats = df.groupby('relationship')['similarity'].agg(['mean', 'var', 'count', 'min', 'max'])
print("Statistics by Relationship Type:")
print(stats)

# Overall statistics
overall_mean = df['similarity'].mean()
overall_var = df['similarity'].var()
print(f"\nOverall Mean: {overall_mean}")
print(f"Overall Variance: {overall_var}")


# Visualization
plt.figure(figsize=(10, 6))
sns.histplot(data=df, x='similarity', hue='relationship', kde=True, bins=30, alpha=0.6)
plt.title('Distribution of Cosine Similarities')
plt.xlabel('Cosine Similarity')
plt.ylabel('Count')
plt.axvline(x=0.99, color='r', linestyle='--', label='Potential Threshold') # Arbitrary guess line
plt.savefig('../data/plots/similarity_dist.png')