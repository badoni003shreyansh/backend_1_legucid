import os
import json
from typing import List, Dict, Any
import vertexai
from vertexai.language_models import TextEmbeddingModel
from vertexai.generative_models import GenerativeModel
from google.cloud import storage
import PyPDF2
import io
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import re
from enum import Enum

# Add DOCX support
try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    print("⚠️  python-docx not installed. Install with: pip install python-docx")

PROJECT_ID = "my-project-29-388706"
LOCATION = "us-central1"
BUCKET_NAME = "my-project-29-388706-documents"

# Add these classes before the RAGChatbot class
class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ClauseRiskAssessment(BaseModel):
    clause_text: str = Field(..., description="The specific clause or section being assessed")
    risk_level: RiskLevel = Field(..., description="Assessed risk level")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in the assessment (0.0 to 1.0)")
    reasoning: str = Field(..., description="Explanation for the risk assessment")
    potential_issues: List[str] = Field(..., description="List of potential legal issues or concerns")

class LegalDocumentRiskAssessment(BaseModel):
    document_name: str = Field(..., description="Name of the legal document")
    overall_risk_level: RiskLevel = Field(..., description="Overall risk level for the document")
    high_risk_clauses: int = Field(..., description="Number of high risk clauses")
    medium_risk_clauses: int = Field(..., description="Number of medium risk clauses")
    low_risk_clauses: int = Field(..., description="Number of low risk clauses")
    clause_assessments: List[ClauseRiskAssessment] = Field(..., description="Detailed assessment of individual clauses")
    summary: str = Field(..., description="Overall summary of the risk assessment")
    recommendations: List[str] = Field(..., description="Recommendations for risk mitigation")

class RAGDocumentProcessor:
    def __init__(self):
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        self.storage_client = storage.Client(project=PROJECT_ID)
        self.bucket = self.storage_client.bucket(BUCKET_NAME)
        self.embedding_model = TextEmbeddingModel.from_pretrained("gemini-embedding-001")
        
    def extract_text_from_pdf(self, pdf_content: bytes) -> str:
        """Extract text from PDF content"""
        try:
            pdf_file = io.BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            return ""
    
    def extract_text_from_docx(self, docx_content: bytes) -> str:
        """Extract text from DOCX content"""
        try:
            if not DOCX_AVAILABLE:
                print("❌ python-docx not available")
                return ""
            
            docx_file = io.BytesIO(docx_content)
            doc = Document(docx_file)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            print(f"Error extracting DOCX text: {e}")
            return ""
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to find a sentence boundary near the end
            if end < len(text):
                boundary = text.rfind('.', start, end)
                if boundary > start + chunk_size // 2:
                    end = boundary + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = max(start + chunk_size - overlap, end)
            
        return chunks
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for text chunks"""
        try:
            embeddings = self.embedding_model.get_embeddings(texts)
            return [embedding.values for embedding in embeddings]
        except Exception as e:
            print(f"Error generating embeddings: {e}")
            return []
    
    def process_document(self, blob_name: str, content: bytes = None) -> Dict[str, Any]:
        """Process a single document from the bucket or from provided content"""
        print(f"Processing document: {blob_name}")
        
        try:
            # Download document if content not provided
            if content is None:
                blob = self.bucket.blob(blob_name)
                content = blob.download_as_bytes()
            
            # Extract text based on file type
            if blob_name.lower().endswith('.pdf'):
                text = self.extract_text_from_pdf(content)
            elif blob_name.lower().endswith('.docx'):
                text = self.extract_text_from_docx(content)
            elif blob_name.lower().endswith(('.txt', '.md')):
                text = content.decode('utf-8')
            else:
                print(f"Unsupported file type: {blob_name}")
                return None
            
            if not text:
                print(f"No text extracted from {blob_name}")
                return None
            
            # Chunk the text
            chunks = self.chunk_text(text)
            print(f"Created {len(chunks)} chunks from {blob_name}")
            
            # Generate embeddings
            embeddings = self.generate_embeddings(chunks)
            
            if not embeddings:
                print(f"Failed to generate embeddings for {blob_name}")
                return None
            
            return {
                'document_name': blob_name,
                'chunks': chunks,
                'embeddings': embeddings,
                'processed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error processing {blob_name}: {e}")
            return None
    def process_all_documents(self) -> List[Dict[str, Any]]:
        """Process all documents in the bucket"""
        processed_docs = []
        
        # List all files in the bucket
        blobs = self.bucket.list_blobs()
        
        for blob in blobs:
            if blob.name.lower().endswith(('.pdf', '.txt', '.md', '.docx')):
                doc_data = self.process_document(blob.name)
                if doc_data:
                    processed_docs.append(doc_data)
        
        return processed_docs

class RAGVectorStore:
    def __init__(self):
        self.documents = []
        self.embeddings = []
        self.metadata = []
    
    def add_documents(self, processed_docs: List[Dict[str, Any]]):
        """Add processed documents to the vector store"""
        for doc in processed_docs:
            for i, (chunk, embedding) in enumerate(zip(doc['chunks'], doc['embeddings'])):
                self.documents.append(chunk)
                self.embeddings.append(embedding)
                self.metadata.append({
                    'document_name': doc['document_name'],
                    'chunk_index': i,
                    'processed_at': doc['processed_at']
                })
    
    def similarity_search(self, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Find most similar documents using cosine similarity"""
        import numpy as np
        
        if not self.embeddings:
            return []
        
        # Calculate cosine similarities
        query_vec = np.array(query_embedding)
        similarities = []
        
        for embedding in self.embeddings:
            doc_vec = np.array(embedding)
            similarity = np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec))
            similarities.append(similarity)
        
        # Get top_k most similar documents
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            results.append({
                'content': self.documents[idx],
                'similarity': similarities[idx],
                'metadata': self.metadata[idx]
            })
        
        return results

class RAGChatbot:
    def __init__(self, vector_store: RAGVectorStore):
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        self.vector_store = vector_store
        self.embedding_model = TextEmbeddingModel.from_pretrained("gemini-embedding-001")
        self.generative_model = GenerativeModel("gemini-2.0-flash-exp")

    def assess_legal_document_risk(self, document_name: str, max_clauses: int = 20) -> LegalDocumentRiskAssessment:
        """
        Analyze a legal document for risk assessment and categorize clauses into high, medium, low risk.
        
        Args:
            document_name: Name of the document to analyze
            max_clauses: Maximum number of clauses to analyze
            
        Returns:
            LegalDocumentRiskAssessment with detailed risk analysis
        """
        try:
            # Use the get_document_chunks method instead of accessing vector_store directly
            document_chunks = self.get_document_chunks(document_name)
            
            if not document_chunks:
                raise ValueError(f"No document found with name: {document_name}")
            
            # Combine chunks to form the complete document text
            full_document_text = "\n\n".join([chunk['content'] for chunk in document_chunks])
            
            # Create prompt for risk assessment
            prompt = f"""You are a legal expert specializing in risk assessment. Analyze the following legal document and provide a comprehensive risk assessment.

    DOCUMENT: {document_name}
    CONTENT:
    {full_document_text[:10000]}  # Limit context size

    INSTRUCTIONS:
    1. Identify and extract key clauses/sections from the document
    2. For each clause, assess the risk level (high, medium, low) with confidence score
    3. Provide reasoning for each risk assessment
    4. List potential legal issues or concerns for each clause
    5. Provide an overall risk assessment for the entire document
    6. Give recommendations for risk mitigation
    7. Return the analysis in JSON format matching this schema:
    {{
        "document_name": "string",
        "overall_risk_level": "high|medium|low",
        "high_risk_clauses": int,
        "medium_risk_clauses": int,
        "low_risk_clauses": int,
        "clause_assessments": [
            {{
                "clause_text": "string",
                "risk_level": "high|medium|low",
                "confidence_score": float,
                "reasoning": "string",
                "potential_issues": ["string", ...]
            }}
        ],
        "summary": "string",
        "recommendations": ["string", ...]
    }}

    Focus on identifying:
    - Ambiguous language or vague terms
    - Unfavorable terms for the signing party
    - Regulatory compliance issues
    - Liability and indemnification clauses
    - Termination and renewal conditions
    - Intellectual property rights
    - Confidentiality obligations
    - Dispute resolution mechanisms
    - Financial obligations and penalties

    Ensure the response is valid JSON that can be parsed by Python's json.loads().
    """

            # Generate risk assessment
            response = self.generative_model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text
            
            # Clean the response to extract JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in the response")
            
            json_str = json_match.group()
            
            # Parse JSON and create Pydantic model
            assessment_data = json.loads(json_str)
            
            # Convert to Pydantic model
            risk_assessment = LegalDocumentRiskAssessment(**assessment_data)
            
            return risk_assessment
            
        except Exception as e:
            raise ValueError(f"Error assessing legal document risk: {str(e)}")
    # Add this method to the RAGChatbot class in rag_chatbot.py
    def get_document_chunks(self, document_name: str) -> List[Dict[str, Any]]:
        """Retrieve all chunks for a specific document"""
        document_chunks = []
        
        # Check if vector_store exists and has metadata
        if not self.vector_store or not hasattr(self.vector_store, 'metadata'):
            raise ValueError("Vector store not properly initialized")
        
        for i, metadata in enumerate(self.vector_store.metadata):
            if metadata['document_name'] == document_name:
                document_chunks.append({
                    'content': self.vector_store.documents[i],  # Fixed: access through vector_store
                    'chunk_index': metadata['chunk_index']
                })
        
        if not document_chunks:
            raise ValueError(f"No document found with name: {document_name}")
        
        # Sort chunks by index for proper document order
        document_chunks.sort(key=lambda x: x['chunk_index'])
        return document_chunks
    
    def generate_response(self, query: str, max_context_chunks: int = 3) -> Dict[str, Any]:
        """Generate response using RAG"""
        try:
            # Generate query embedding
            query_embeddings = self.embedding_model.get_embeddings([query])
            query_embedding = query_embeddings[0].values
            
            # Retrieve relevant documents
            relevant_docs = self.vector_store.similarity_search(
                query_embedding, 
                top_k=max_context_chunks
            )
            
            if not relevant_docs:
                return {
                    'response': "I don't have enough information to answer your question based on the available documents.",
                    'sources': [],
                    'context_used': False,
                    'query': query
                }
            
            # Build context from retrieved documents
            context_parts = []
            sources = []
            
            for doc in relevant_docs:
                context_parts.append(doc['content'])
                sources.append({
                    'document': doc['metadata']['document_name'],
                    'similarity': float(doc['similarity'])
                })
            
            context = "\n\n---\n\n".join(context_parts)
            
            # Create prompt
            prompt = f"""You are a helpful assistant that answers questions based on the provided context documents. 

Context from documents:
{context}

User question: {query}

Instructions:
- Answer the question based primarily on the provided context
- If the context doesn't contain enough information, say so clearly
- Be accurate and cite specific information from the context when possible
- If you need to make inferences, make it clear what is from the documents vs your reasoning
- Keep your response clear and concise

Answer:"""
            
            # Generate response
            response = self.generative_model.generate_content(prompt)
            
            return {
                'response': response.text,
                'sources': sources,
                'context_used': True,
                'query': query
            }
            
        except Exception as e:
            return {
                'response': f"Error generating response: {str(e)}",
                'sources': [],
                'context_used': False,
                'query': query,
                'error': str(e)
            }
