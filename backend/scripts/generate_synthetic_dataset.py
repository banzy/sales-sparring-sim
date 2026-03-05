import json
import os
import uuid
from typing import List

# Mock dataset of service and scenario docs for the RAG engine
SYNTHETIC_DOCS = [
    {
        "title": "AI Engineering Services Overview",
        "doc_type": "service_catalog",
        "industry": ["all"],
        "buyer_persona": ["CIO", "CTO", "COO"],
        "service_line": ["ai_engineering"],
        "text": "We provide end-to-end AI engineering services, specializing in LLM integration, custom RAG pipelines, and intelligent document processing. Our typical deployment timeline is 8-12 weeks."
    },
    {
        "title": "Case Study: Logistics Document Automation",
        "doc_type": "case_study",
        "industry": ["logistics", "supply_chain"],
        "buyer_persona": ["COO", "Head of Operations"],
        "service_line": ["document_automation"],
        "text": "A global logistics provider was drowning in manual waybill and invoice processing (30,000+ docs/month). We deployed a vision-language model (VLM) pipeline that extracts unstructured data with 99.2% accuracy. Result: 60% reduction in processing time and $1.2M annual savings. ROI achieved in 4.5 months."
    },
    {
        "title": "Handling the 'ROI is too slow' Objection",
        "doc_type": "objection_handling",
        "industry": ["all"],
        "sales_stage": "solutioning",
        "text": "If a buyer pushes back on time-to-value, emphasize our modular approach. We don't do 2-year mega-projects. We identify the highest-friction workflow (usually invoice processing or customer inquiry routing), build a PoC in 4 weeks, and put it in production by week 10. The quick win funds the rest of the roadmap."
    },
    {
        "title": "Security and Compliance FAQ",
        "doc_type": "faq",
        "industry": ["finance", "healthcare", "logistics"],
        "buyer_persona": ["CISO", "CIO"],
        "text": "Data Privacy: We do not train foundation models on your proprietary data. All inference happens within your VPC or a dedicated tenant. We are SOC 2 Type II compliant and GDPR ready. Data is encrypted AT REST (AES-256) and IN TRANSIT (TLS 1.3)."
    },
    {
        "title": "Why Not Just Use Off-the-Shelf Tools?",
        "doc_type": "competitor_comparison",
        "text": "Buyers often ask why they can't just use Microsoft Copilot or generic ChatGPT. Our response: Generic tools are great for generic tasks (writing emails). But they hallucinate on 50-page complex technical PDFs, and they don't integrate cleanly with your legacy ERP systems. We build bespoke pipelines that understand your specific domain taxonomy and trigger real internal actions."
    }
]

def main():
    os.makedirs("app/data/synthetic_docs", exist_ok=True)
    
    docs_to_save = []
    for i, doc in enumerate(SYNTHETIC_DOCS):
        doc_with_id = {
            "doc_id": f"syn_{uuid.uuid4().hex[:8]}",
            "source_type": "synthetic",
            **doc
        }
        docs_to_save.append(doc_with_id)
        
    with open("app/data/synthetic_docs/corpus.json", "w") as f:
        json.dump(docs_to_save, f, indent=2)
        
    print(f"✅ Generated {len(docs_to_save)} synthetic documents in app/data/synthetic_docs/corpus.json")

if __name__ == "__main__":
    main()
