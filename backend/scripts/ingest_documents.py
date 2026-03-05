import json
import os
import sys

# Add parent dir to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.chunking import prepare_chunks
from app.core.llm_client import LLMClient
from app.storage.vector_store import index_chunks

def main():
    if not os.path.exists("app/data/synthetic_docs/corpus.json"):
        print("❌ corpus.json not found. Run generate_synthetic_dataset.py first.")
        return
        
    with open("app/data/synthetic_docs/corpus.json", "r") as f:
        docs = json.load(f)
        
    print(f"📦 Loaded {len(docs)} documents.")
    
    # 1. Chunk
    print("🔪 Chunking documents...")
    chunks = prepare_chunks(docs, chunk_size=200, overlap=50)
    print(f"Created {len(chunks)} chunks.")
    
    # 2. Embed
    print("🧠 Fetching embeddings from OpenAI...")
    llm = LLMClient()
    texts = [c["text"] for c in chunks]
    embeddings = llm.embed(texts)
    
    # Merge embeddings into chunks
    for chunk, emb in zip(chunks, embeddings):
        chunk["embedding"] = emb
        
    # 3. Store in Qdrant
    print("💾 Uploading to Qdrant...")
    index_chunks(chunks)
    print("✅ Ingestion complete!")

if __name__ == "__main__":
    main()
