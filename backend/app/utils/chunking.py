"""Text chunking and cleaning utilities."""
from __future__ import annotations
import re
import uuid


def clean_text(text: str) -> str:
    """Remove excess whitespace and normalise line endings."""
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_document(
    doc: dict,
    chunk_size: int = 700,
    overlap: int = 100,
) -> list[dict]:
    """
    Split a document dict (with 'text' and metadata fields) into
    overlapping chunks ready for embedding.

    Returns list of chunk dicts with:
      - chunk_id
      - doc_id
      - text
      - metadata (inherited from doc + chunk_index)
    """
    text = clean_text(doc.get("text", ""))
    words = text.split()
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_text = " ".join(words[start:end])
        doc_id = doc.get("doc_id", str(uuid.uuid4()))

        metadata = {k: v for k, v in doc.items() if k not in ("text", "doc_id")}
        metadata["chunk_index"] = chunk_index
        metadata["doc_id"] = doc_id

        chunks.append(
            {
                "chunk_id": f"{doc_id}_chunk_{chunk_index:03d}",
                "doc_id": doc_id,
                "text": chunk_text,
                "metadata": metadata,
            }
        )

        start += chunk_size - overlap
        chunk_index += 1

    return chunks


def prepare_chunks(docs: list[dict], **kwargs) -> list[dict]:
    """Chunk all documents and return a flat list of chunks."""
    all_chunks = []
    for doc in docs:
        all_chunks.extend(chunk_document(doc, **kwargs))
    return all_chunks
