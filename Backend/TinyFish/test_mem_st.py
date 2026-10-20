import os
import psutil
import torch
import numpy as np

proc = psutil.Process()
print(f"Baseline: {proc.memory_info().rss / 1e6:.1f} MB")

# Test transformers AutoModel vs SentenceTransformer memory
from transformers import AutoTokenizer, AutoModel
print(f"After transformers import: {proc.memory_info().rss / 1e6:.1f} MB")

tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
model = AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
model.eval()
print(f"After AutoModel loaded: {proc.memory_info().rss / 1e6:.1f} MB")

text = "Worker entered separator vessel V-102 at Pump Station 4"
inputs = tokenizer(text, padding=True, truncation=True, return_tensors="pt")
with torch.no_grad():
    out = model(**inputs)
    token_embeddings = out[0]
    attention_mask = inputs["attention_mask"].unsqueeze(-1).expand(token_embeddings.size()).float()
    sum_embeddings = torch.sum(token_embeddings * attention_mask, 1)
    sum_mask = torch.clamp(attention_mask.sum(1), min=1e-9)
    emb1 = torch.nn.functional.normalize(sum_embeddings / sum_mask, p=2, dim=1).numpy()[0]

print(f"After AutoModel encode: {proc.memory_info().rss / 1e6:.1f} MB")

# Now check sentence_transformers
from sentence_transformers import SentenceTransformer
st = SentenceTransformer('all-MiniLM-L6-v2')
emb2 = st.encode(text, normalize_embeddings=True)
print(f"After SentenceTransformer import and load: {proc.memory_info().rss / 1e6:.1f} MB")

diff = np.max(np.abs(emb1 - emb2))
print(f"Max absolute difference between AutoModel and SentenceTransformer: {diff:.8f}")
