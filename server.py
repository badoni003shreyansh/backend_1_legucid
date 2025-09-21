from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
import shutil
import os
import tempfile
from typing import Dict, List, Any, Optional
import asyncio
import logging
 
# Import your components
from rag_chatbot import RAGDocumentProcessor, RAGVectorStore, RAGChatbot
from audio_overview import create_legal_document_audio_explanation  # Updated import
from google.cloud import storage
 
from datetime import datetime
 
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
 
# Configuration
PROJECT_ID = "my-project-29-388706"
LOCATION = "us-central1"
BUCKET_NAME = "my-project-29-388706-documents"
SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.md'}
 
# FastAPI App
app = FastAPI(
    title="Unified Document AI API",
    description="Upload, chat with, and get audio explanations of your documents using Vertex AI",
    version="1.0.0"
)
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# Global variables for RAG system
vector_store = None
chatbot = None
is_initialized = False
 
# Pydantic Models
class ChatRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    query: str
    max_context_chunks: int = 3
 
class ChatResponse(BaseModel):
    model_config = ConfigDict(extra='forbid')
    response: str
    sources: List[Dict[str, Any]]
    context_used: bool
    query: str
    error: Optional[str] = None
 
class DocumentInfo(BaseModel):
    model_config = ConfigDict(extra='forbid')
    documents: List[str]
    total_chunks: int
    bucket: str
 
class ReindexResponse(BaseModel):
    model_config = ConfigDict(extra='forbid')
    message: str
    documents_processed: int
    total_chunks: int
 
class UploadResponse(BaseModel):
    model_config = ConfigDict(extra='forbid')
    success: bool
    message: str
    filename: str
    gcs_uri: str
 
# Add this new Pydantic model to server.py
class UploadResponseWithRisk(BaseModel):
    model_config = ConfigDict(extra='forbid')
    success: bool
    message: str
    filename: str
    gcs_uri: str
    risk_assessment: Optional[Dict[str, Any]] = None
    has_risk_assessment: bool = False
    risk_summary: Optional[Dict[str, Any]] = None
 
class RiskAssessmentRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    document_name: str
    max_clauses: Optional[int] = 20
 
class RiskAssessmentResponse(BaseModel):
    model_config = ConfigDict(extra='forbid')
    success: bool
    document_name: str
    risk_assessment: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    assessed_at: str
 
class AudioExplanationResponse(BaseModel):
    model_config = ConfigDict(extra='forbid')
    success: bool
    message: str
    audio_url: str
    document_details: Dict[str, Any]

# Updated Audio Request Model to match the attached file structure
class AudioExplanationRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    file_uri: str
    voice_preference: Optional[str] = "Achernar"
 
# Helper Functions
async def upload_file_to_gcs(file_path: str, filename: str) -> str:
    """Upload file to Google Cloud Storage"""
    try:
        storage_client = storage.Client(project=PROJECT_ID)
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(filename)
        
        blob.upload_from_filename(file_path)
        logger.info(f"File {filename} uploaded to GCS")
        
        return f"gs://{BUCKET_NAME}/{filename}"
    except Exception as e:
        logger.error(f"Error uploading to GCS: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
 
# Updated function to use the new audio_overview function
def run_audio_explanation(document_uri: str, voice_preference: str = "Achernar") -> Dict:
    """Run the legal document audio explanation generation synchronously"""
    try:
        return create_legal_document_audio_explanation(document_uri, voice_preference)
    except Exception as e:
        logger.error(f"Error generating audio explanation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate audio explanation: {str(e)}")
 
# API Endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize empty RAG system on startup"""
    global vector_store, chatbot, is_initialized
 
    try:
        print("🚀 Starting Unified Document AI System (empty mode).")
        
        # Initialize empty vector store
        vector_store = RAGVectorStore()
        chatbot = RAGChatbot(vector_store)
        is_initialized = True
 
        print("✅ System initialized (no documents loaded yet).")
 
    except Exception as e:
        print(f"❌ Failed to initialize system: {e}")
        is_initialized = False
 
 
@app.get("/")
async def root():
    """Health check and system info"""
    return {
        "message": "Unified Document AI API",
        "status": "active" if is_initialized else "initializing",
        "documents_loaded": len(vector_store.documents) if vector_store else 0,
        "bucket": BUCKET_NAME,
        "features": [
            "Document Upload",
            "RAG Chatbot", 
            "Legal Document Audio Explanations with Achernar Voice",
            "Document Management"
        ],
        "voices_available": ["Achernar"],
        "endpoints": {
            "upload": "/upload-document/",
            "chat": "/chat",
            "explain": "/explain-document/", 
            "documents": "/documents",
            "reindex": "/reindex"
        }
    }
 
@app.post("/upload-document/", response_model=UploadResponseWithRisk)
async def upload_document(file: UploadFile = File(...), include_risk_assessment: bool = True):
    """Upload a document to Google Cloud Storage, create chunks, and optionally perform risk assessment"""
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
 
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 50MB")
 
    risk_assessment_result = None
    has_risk_assessment = False
    risk_summary = None
 
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
        tmp_file_path = tmp_file.name
        try:
            # 1. Save upload locally
            shutil.copyfileobj(file.file, tmp_file)
            
            # 2. Read the file content
            with open(tmp_file_path, 'rb') as f:
                file_content = f.read()
 
            # 3. Upload to GCS
            try:
                gcs_uri = await upload_file_to_gcs(tmp_file_path, file.filename)
                print(f"✅ File uploaded to GCS: {gcs_uri}")
            except Exception as e:
                import traceback; traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"GCS upload failed: {repr(e)}")
 
            # 4. Process this specific document into chunks using the file content
            try:
                processor = RAGDocumentProcessor()
                processed_doc = await asyncio.get_event_loop().run_in_executor(
                    None, 
                    lambda: processor.process_document(file.filename, file_content)
                )
                if processed_doc:
                    print(f"✅ Document processed: {len(processed_doc['chunks'])} chunks created")
                else:
                    print(f"❌ Document processing failed for {file.filename}")
                    raise HTTPException(status_code=500, detail="Document processing failed")
            except Exception as e:
                import traceback; traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Document processing failed: {repr(e)}")
 
            # 5. Add chunks to vector store
            try:
                if processed_doc:
                    vector_store.add_documents([processed_doc])
                    print(f"📄 Added {len(processed_doc['chunks'])} chunks from {file.filename} to vector store")
                    
                    # 6. Perform risk assessment if requested and document is legal-related
                    if (include_risk_assessment and processed_doc and 
                        file.filename.lower().endswith(('.pdf', '.docx', '.doc'))):
                        try:
                            # Check if document appears to be legal (based on common legal terms)
                            full_text = "\n".join(processed_doc['chunks'])
                            legal_terms = ['agreement', 'contract', 'clause', 'party', 'obligation', 
                                         'liability', 'indemnification', 'warranty', 'termination',
                                         'confidentiality', 'intellectual property', 'governing law',
                                         'jurisdiction', 'arbitration', 'dispute resolution']
                            
                            if any(term in full_text.lower() for term in legal_terms):
                                print(f"⚖️  Performing risk assessment for {file.filename}")
                                
                                # Perform risk assessment
                                risk_assessment = await asyncio.get_event_loop().run_in_executor(
                                    None, chatbot.assess_legal_document_risk, file.filename
                                )
                                
                                # Convert to dict and add detailed logging
                                risk_assessment_result = risk_assessment.dict()
                                has_risk_assessment = True
                                
                                # Create simplified summary for response
                                risk_summary = {
                                    "overall_risk_level": risk_assessment_result.get('overall_risk_level', 'N/A'),
                                    "high_risk_clauses": risk_assessment_result.get('high_risk_clauses', 0),
                                    "medium_risk_clauses": risk_assessment_result.get('medium_risk_clauses', 0),
                                    "low_risk_clauses": risk_assessment_result.get('low_risk_clauses', 0),
                                    "total_clauses_assessed": len(risk_assessment_result.get('clause_assessments', [])),
                                    "clause_summaries": []
                                }
                                
                                # Add simplified clause information
                                clause_assessments = risk_assessment_result.get('clause_assessments', [])
                                for i, clause in enumerate(clause_assessments):
                                    risk_summary["clause_summaries"].append({
                                        "clause_number": i + 1,
                                        "risk_level": clause.get('risk_level', 'N/A'),
                                        "confidence_score": round(clause.get('confidence_score', 0), 2),
                                        "brief_explanation": clause.get('reasoning', '')[:150] + "..." if len(clause.get('reasoning', '')) > 150 else clause.get('reasoning', ''),
                                        "clause_preview": clause.get('clause_text', '')[:100] + "..." if len(clause.get('clause_text', '')) > 100 else clause.get('clause_text', '')
                                    })
                                
                                # Limit to first 10 clauses for response
                                risk_summary["clause_summaries"] = risk_summary["clause_summaries"][:10]
                                risk_summary["has_more_clauses"] = len(clause_assessments) > 10
                                
                                # Console logging for the response
                                print(f"✅ Risk assessment completed for {file.filename}")
                                print(f"📊 Overall risk level: {risk_summary['overall_risk_level']}")
                                print(f"🔴 High risk clauses: {risk_summary['high_risk_clauses']}")
                                print(f"🟡 Medium risk clauses: {risk_summary['medium_risk_clauses']}")
                                print(f"🟢 Low risk clauses: {risk_summary['low_risk_clauses']}")
                                print(f"📝 Total clauses assessed: {risk_summary['total_clauses_assessed']}")
                                
                                # Log first few clause assessments for debugging
                                for i, clause in enumerate(risk_summary["clause_summaries"][:3]):
                                    print(f"   Clause {clause['clause_number']}: {clause['risk_level']} risk "
                                          f"(confidence: {clause['confidence_score']:.2f})")
                                    print(f"      Preview: {clause['clause_preview']}")
                                
                                if risk_summary["has_more_clauses"]:
                                    print(f"   ... and {risk_summary['total_clauses_assessed'] - 10} more clauses")
                                    
                            else:
                                print(f"📄 Document {file.filename} doesn't appear to be legal - skipping risk assessment")
                                
                        except Exception as e:
                            print(f"⚠️  Risk assessment failed for {file.filename}: {e}")
                            print(f"📋 Error details: {repr(e)}")
                            # Include error info in response for debugging
                            risk_assessment_result = {
                                "error": str(e),
                                "error_type": type(e).__name__,
                                "document": file.filename,
                                "timestamp": datetime.now().isoformat()
                            }
                            risk_summary = {
                                "error": str(e),
                                "error_type": type(e).__name__,
                                "assessment_failed": True
                            }
                            has_risk_assessment = False
                    else:
                        print(f"📄 Risk assessment skipped for {file.filename} (not a supported format or not requested)")
                            
            except Exception as e:
                import traceback; traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Vector store update failed: {repr(e)}")
 
            return UploadResponseWithRisk(
                success=True,
                message="Document uploaded and processed successfully",
                filename=file.filename,
                gcs_uri=gcs_uri,
                risk_assessment=risk_assessment_result,
                has_risk_assessment=has_risk_assessment,
                risk_summary=risk_summary
            )
 
        finally:
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
 
@app.post("/chat", response_model=ChatResponse)
async def chat_with_documents(request: ChatRequest):
    """Chat with your documents using RAG"""
    
    if not is_initialized or not chatbot:
        raise HTTPException(
            status_code=503, 
            detail="RAG system is not initialized yet. Please try again in a few moments."
        )
    
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, chatbot.generate_response, request.query, request.max_context_chunks
        )
        
        return ChatResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")
 
# Updated explain-document endpoint to use the new structure
@app.post("/explain-document/", response_model=AudioExplanationResponse)
async def explain_legal_document(request: AudioExplanationRequest):
    """Generate natural audio explanation for a legal document using Achernar voice"""
    
    if not request.file_uri:
        raise HTTPException(status_code=400, detail="Field 'file_uri' is required.")
    
    print(f"⚖️ Generating legal explanation for: {request.file_uri}")
    print(f"🎙️ Using voice: {request.voice_preference}")
    print("🎭 Using advanced Achernar retry logic for 100% success rate")
 
    try:
        # Use the updated create_legal_document_audio_explanation function
        result = await asyncio.get_event_loop().run_in_executor(
            None, 
            create_legal_document_audio_explanation, 
            request.file_uri,
            request.voice_preference
        )
        
        if result['success']:
            print(f"✅ Legal audio explanation generated: {result['audio_url']}")
            if request.voice_preference == "Achernar":
                print("🎭 Achernar voice processing completed successfully!")
        else:
            print(f"⚠️ Failed to generate explanation: {result['message']}")
            
        return AudioExplanationResponse(**result)
        
    except Exception as e:
        logger.error(f"Error generating audio explanation: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate audio explanation: {str(e)}"
        )
 
@app.get("/documents", response_model=DocumentInfo)
async def list_documents():
    """List processed documents"""
    if not vector_store:
        return DocumentInfo(documents=[], total_chunks=0, bucket=BUCKET_NAME)
    
    doc_names = list(set(meta['document_name'] for meta in vector_store.metadata))
    
    return DocumentInfo(
        documents=doc_names,
        total_chunks=len(vector_store.documents),
        bucket=BUCKET_NAME
    )
 
@app.post("/reindex", response_model=ReindexResponse)
async def reindex_documents():
    """Reprocess and reindex all documents"""
    global vector_store, chatbot, is_initialized
    
    try:
        print("🔄 Reindexing documents...")
        
        processor = RAGDocumentProcessor()
        processed_docs = await asyncio.get_event_loop().run_in_executor(
            None, processor.process_all_documents
        )
        
        if processed_docs:
            vector_store = RAGVectorStore()
            vector_store.add_documents(processed_docs)
            chatbot = RAGChatbot(vector_store)
            is_initialized = True
            
            return ReindexResponse(
                message="Documents reindexed successfully",
                documents_processed=len(processed_docs),
                total_chunks=len(vector_store.documents)
            )
        else:
            return ReindexResponse(
                message="No documents were processed",
                documents_processed=0,
                total_chunks=0
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reindexing: {str(e)}")
 
@app.get("/status/{filename}")
async def get_document_status(filename: str):
    """Check if a document exists in storage"""
    try:
        storage_client = storage.Client(project=PROJECT_ID)
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(filename)
        
        exists = blob.exists()
        return {
            "filename": filename,
            "exists": exists,
            "gcs_uri": f"gs://{BUCKET_NAME}/{filename}" if exists else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking status: {str(e)}")
 
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
