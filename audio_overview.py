import os
import json
import base64
import time
import re
from typing import List, Dict
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from google.cloud import storage
from googleapiclient.discovery import build
 
PROJECT_ID = "my-project-29-388706"
LOCATION = "us-central1"
PODCAST_BUCKET = "my-project-29-388706-podcasts"
 
def split_text_into_chunks(text: str, max_chars: int = 4500) -> List[str]:
    """Split long text into chunks that fit within TTS limits"""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                words = sentence.split()
                temp_chunk = ""
                for word in words:
                    if len(temp_chunk) + len(word) + 1 > max_chars:
                        if temp_chunk:
                            chunks.append(temp_chunk.strip())
                        temp_chunk = word
                    else:
                        temp_chunk += " " + word if temp_chunk else word
                current_chunk = temp_chunk
        else:
            current_chunk += " " + sentence if current_chunk else sentence
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks
 
def extract_document_topics(document: Part) -> List[str]:
    """Extract key topics, clauses, and sections from the document"""
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel("gemini-2.0-flash-exp")
    
    prompt = """Analyze this document and extract the main topics, themes, clauses, and key points covered.
    
    Return a list of 6-10 key items, focusing on:
    - Main topics or themes
    - Key concepts or methodologies  
    - Important findings or conclusions
    - Legal clauses (if applicable)
    - Technical approaches (if applicable)
    - Main arguments or points
    
    Format as a simple list:
    - Item 1
    - Item 2
    - Item 3
    etc."""
    
    try:
        responses = model.generate_content([
            "Document for analysis:", document, prompt
        ], stream=True)
        
        response_text = ""
        for response in responses:
            response_text += response.text
        
        topics = []
        for line in response_text.split('\n'):
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•')):
                topic = line.lstrip('-•').strip()
                if topic:
                    topics.append(topic)
        
        return topics[:10]
        
    except Exception as e:
        print(f"❌ Topic extraction error: {e}")
        return ["Document Analysis", "Key Points", "Main Topics", "Important Findings"]
 
def generate_document_explanation(document: Part, target_audience: str = "general public") -> str:
    """Generate clear, comprehensive explanation of document"""
    
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel("gemini-2.0-flash-exp")
    
    prompt = f"""You are explaining a document to someone who needs to understand it clearly. 
 
Start EXACTLY with: "OK, the document you uploaded is about..."
 
Then provide a comprehensive, easy-to-understand explanation covering:
 
1. **What type of document this is** and its main purpose
2. **Key topics or themes** discussed  
3. **Main findings or conclusions** (if applicable)
4. **Important methodologies or approaches** (if applicable)
5. **Legal terms or clauses** (if applicable) explained in plain English
6. **Technical concepts** (if applicable) made simple
7. **Key implications or significance**
8. **What the reader should understand** or key takeaways
 
Guidelines:
- Use simple, clear language that anyone can understand
- Explain technical jargon, legal terms, or complex concepts in plain English
- Point out important sections that people often miss
- Be thorough but conversational
- Don't skip any important sections  
- Make complex concepts easy to grasp
- Help them understand the significance and implications
 
Target audience: {target_audience}
Length: 4-5 minutes of clear explanation (500-600 words)
 
Remember: Start with "OK, the document you uploaded is about..." and make it sound natural and helpful.
"""
    
    try:
        responses = model.generate_content([
            "Document requiring clear explanation:", document, prompt
        ], stream=True)
        
        response_text = ""
        for response in responses:
            response_text += response.text
        
        return response_text.strip()
        
    except Exception as e:
        print(f"❌ Explanation generation error: {e}")
        return ""
 
def generate_audio_from_long_text(script_text: str) -> str:
    """Generate audio from long text by splitting into chunks"""
    try:
        text_chunks = split_text_into_chunks(script_text, max_chars=4500)
        print(f"🔄 Splitting text into {len(text_chunks)} chunks for synthesis...")
        
        service = build('texttospeech', 'v1')
        audio_contents = []
        
        for i, chunk in enumerate(text_chunks, 1):
            print(f"🎵 Synthesizing chunk {i}/{len(text_chunks)}...")
            
            response = service.text().synthesize(
                body={
                    'input': {'text': chunk},
                    'voice': {
                        'languageCode': 'en-US',
                        'name': 'en-US-Wavenet-F',  # Professional female voice
                        'ssmlGender': 'FEMALE'
                    },
                    'audioConfig': {
                        'audioEncoding': 'MP3',
                        'pitch': 0.0,  # Natural pitch
                        'speakingRate': 1.2,  # Faster speech
                        'volumeGainDb': 4.0  # Clear and strong
                    }
                }
            ).execute()
            
            audio_contents.append(response['audioContent'])
            
            if i < len(text_chunks):
                time.sleep(1)
        
        print("🔗 Combining audio chunks...")
        combined_audio = b''.join([base64.b64decode(content) for content in audio_contents])
        
        return base64.b64encode(combined_audio).decode('utf-8')
        
    except Exception as e:
        print(f"❌ Audio generation error: {e}")
        return ""
 
def upload_audio_to_gcs(audio_content: str, filename: str) -> str:
    """Upload audio file to Google Cloud Storage"""
    try:
        client = storage.Client(project=PROJECT_ID)
        bucket = client.bucket(PODCAST_BUCKET)
        blob = bucket.blob(filename)
        
        audio_data = base64.b64decode(audio_content)
        blob.upload_from_string(audio_data, content_type='audio/mp3')
        blob.make_public()  # 🔑 Make file public
        return blob.public_url
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return ""
 
def create_document_audio_explanation(document_uri: str, target_audience: str = "general public") -> Dict:
    """Generate comprehensive document explanation in audio format"""
 
    print(f"🎵 Creating audio explanation from: {document_uri}")
    print("📄 This will explain the document content clearly")
 
    # Determine MIME type based on file extension
    if document_uri.lower().endswith('.pdf'):
        mime_type = "application/pdf"
    elif document_uri.lower().endswith('.docx'):
        mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"  
    elif document_uri.lower().endswith('.doc'):
        mime_type = "application/msword"
    else:
        mime_type = "application/pdf"  # Default
 
    # ✅ Handle GCS URL directly or upload local file to GCS
    if document_uri.startswith("gs://"):
        print("☁️ GCS URL detected, skipping upload...")
        gcs_uri = document_uri
    else:
        # Local file → upload to GCS first
        print("📂 Local file detected, uploading to GCS...")
        client = storage.Client(project=PROJECT_ID)
        bucket = client.bucket(PODCAST_BUCKET)
        filename = os.path.basename(document_uri)
        blob = bucket.blob(filename)
        blob.upload_from_filename(document_uri)
        blob.make_public()
        gcs_uri = f"gs://{PODCAST_BUCKET}/{filename}"
        print(f"☁️ Uploaded to {gcs_uri}")
 
    # Create a Part object from the GCS URI
    document = Part.from_uri(mime_type=mime_type, uri=gcs_uri)
 
    # Extract topics and key points
    print("🔍 Analyzing document structure and key topics...")
    topics = extract_document_topics(document)
    print(f"📋 Identified topics: {', '.join(topics)}")
 
    print("📝 Generating comprehensive explanation...")
    explanation_text = generate_document_explanation(document, target_audience)
 
    if not explanation_text:
        print("❌ Failed to generate explanation")
        return {
            "success": False,
            "message": "Failed to generate document explanation.",
            "audio_url": "",
            "document_details": {}
        }
 
    print("✅ Document explanation generated successfully!")
    print(f"📊 Explanation length: ~{len(explanation_text.split())} words")
    print(f"📏 Character count: {len(explanation_text)} characters")
 
    print("🎵 Converting to audio with clear, authoritative voice...")
    audio_content = generate_audio_from_long_text(explanation_text)
 
    if not audio_content:
        print("❌ Failed to generate audio")
        return {
            "success": False,
            "message": "Failed to generate audio explanation.",
            "audio_url": "",
            "document_details": {}
        }
 
    # Generate filename based on main topic
    main_topic = topics[0].replace(' ', '_') if topics else "Document"
    filename = f"{main_topic}_Audio_Explanation.mp3"
 
    print("☁️ Uploading to cloud storage...")
    url = upload_audio_to_gcs(audio_content, filename)
 
    if url:
        result = {
            "success": True,
            "message": "Audio explanation generated successfully.",
            "audio_url": url,
            "document_details": {
                "topics_covered": topics,
                "target_audience": target_audience,
                "word_count": len(explanation_text.split()),
                "document_type": "Document Audio Overview",
                "style": "Clear, educational, comprehensive explanation"
            }
        }
        print(f"✅ Audio explanation ready: {url}")
        return result
    else:
        print("❌ Upload failed")
        return {
            "success": False,
            "message": "Failed to upload audio to cloud storage.",
            "audio_url": "",
            "document_details": {}
        }
 
if __name__ == "__main__":
    print("🎵 Audio Document Explainer Ready!")