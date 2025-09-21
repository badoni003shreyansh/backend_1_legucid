import os
import json
import base64
import time
import re
import requests
from typing import List, Dict
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from google.cloud import storage
from google.oauth2 import service_account
from google.auth.transport.requests import Request



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



def clean_text_for_tts(text: str) -> str:
    """Clean text to remove markdown and formatting that sounds bad in TTS"""
    
    # Remove markdown headers
    text = re.sub(r'#{1,6}\s+', '', text)
    
    # Remove bold/italic markdown
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # **bold** -> bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # *italic* -> italic
    text = re.sub(r'_([^_]+)_', r'\1', text)        # _italic_ -> italic
    
    # Remove bullet points and lists
    text = re.sub(r'^\s*[-*+•]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    
    # Remove code blocks and inline code
    text = re.sub(r'``````', '', text, flags=re.DOTALL)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # Remove links but keep the text
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    
    # Remove extra whitespace and normalize
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Multiple newlines -> double newline
    text = re.sub(r'[ \t]+', ' ', text)             # Multiple spaces -> single space
    
    # Remove any remaining special characters that might confuse TTS
    text = re.sub(r'[#*_`\[\]()]', '', text)
    
    # Clean up sentences that start with removed markdown
    text = re.sub(r'\n\s*([a-z])', lambda m: '\n' + m.group(1).upper(), text)
    
    return text.strip()



def analyze_legal_risks(document: Part) -> Dict[str, any]:
    """Analyze document for legal risks and red flags"""
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel("gemini-2.0-flash-exp")
    
    prompt = """Analyze this legal document and identify key risks, red flags, and important clauses.
    
    Focus on:
    1. **High-Risk Clauses**: Identify any clauses that could be problematic or unfavorable
    2. **Red Flags**: Point out vague language, unlimited liability, automatic renewals, harsh penalties
    3. **Hidden Obligations**: Find any obligations that might not be immediately obvious
    4. **Termination Issues**: Explain termination conditions and potential exit challenges
    5. **Financial Commitments**: Clarify all financial obligations, fees, and penalties
    6. **Liability & Indemnification**: Explain who bears risk and responsibility
    7. **Intellectual Property**: Identify IP ownership and usage rights issues
    8. **Dispute Resolution**: Explain arbitration clauses and their implications
    9. **Document Topics**: Identify the main topics, themes, and key sections covered
    10. **Document Classification**: Determine the document type and purpose
    
    Return a structured analysis in JSON format:
    {
        "document_type": "Type of legal document (e.g., NDA, Service Agreement, etc.)",
        "document_purpose": "Brief description of document's main purpose",
        "topics_covered": ["Topic 1", "Topic 2", "Topic 3", ...],
        "high_risk_items": [
            {"clause": "description", "risk": "explanation", "location": "where in document"}
        ],
        "red_flags": ["list of concerning items"],
        "financial_obligations": ["list of financial commitments"],
        "key_dates": ["important dates and deadlines"],
        "favorable_terms": ["any terms that benefit the reader"],
        "action_items": ["what the reader should consider or negotiate"],
        "termination_clauses": ["conditions for ending the agreement"],
        "liability_issues": ["liability and indemnification concerns"],
        "ip_rights": ["intellectual property ownership and usage rights"],
        "dispute_resolution": ["how disputes are handled"],
        "confidentiality_terms": ["confidentiality and non-disclosure requirements"],
        "compliance_requirements": ["regulatory or legal compliance obligations"],
        "overall_risk_level": "HIGH/MEDIUM/LOW"
    }"""
    
    try:
        responses = model.generate_content([
            "Document for risk analysis:", document, prompt
        ], stream=True)
        
        response_text = ""
        for response in responses:
            response_text += response.text
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            risk_data = json.loads(json_match.group())
            
            # Ensure all required fields exist with defaults
            risk_data.setdefault('document_type', 'Legal Document')
            risk_data.setdefault('document_purpose', 'Legal agreement or contract')
            risk_data.setdefault('topics_covered', [])
            risk_data.setdefault('high_risk_items', [])
            risk_data.setdefault('red_flags', [])
            risk_data.setdefault('financial_obligations', [])
            risk_data.setdefault('key_dates', [])
            risk_data.setdefault('favorable_terms', [])
            risk_data.setdefault('action_items', [])
            risk_data.setdefault('termination_clauses', [])
            risk_data.setdefault('liability_issues', [])
            risk_data.setdefault('ip_rights', [])
            risk_data.setdefault('dispute_resolution', [])
            risk_data.setdefault('confidentiality_terms', [])
            risk_data.setdefault('compliance_requirements', [])
            risk_data.setdefault('overall_risk_level', 'MEDIUM')
            
            return risk_data
        return {}
        
    except Exception as e:
        print(f"⚠️ Risk analysis error: {e}")
        return {}



def generate_legal_explanation_script(document: Part, risk_analysis: Dict) -> str:
    """Generate natural, conversational explanation of legal document with risk insights"""
    
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel("gemini-2.0-flash-exp")
    
    # Convert risk analysis to readable format
    risk_summary = json.dumps(risk_analysis, indent=2) if risk_analysis else "No specific risks identified"
    
    prompt = f"""You are a friendly legal advisor explaining a document to someone who has no legal background.
Create a NATURAL, CONVERSATIONAL audio script that sounds like you're having a coffee chat with a friend.


IMPORTANT: This script will be converted to AUDIO, so:
- NO markdown formatting (no **, ##, bullets, etc.)
- NO special characters or symbols
- NO lists with dashes or bullets
- Use ONLY plain text that sounds natural when spoken
- Write everything as flowing conversational paragraphs


Risk Analysis Results:
{risk_summary}


Create a script that:


1. **Opens warmly and naturally**: Start with something like "Alright, so I've gone through your document, and let me break down what you really need to know..."


2. **Explains the document type**: What kind of agreement is this? Use everyday language.


3. **Highlights the MOST IMPORTANT things first**: What are the 2-3 things they absolutely must understand?


4. **Explains red flags conversationally**: 
   - Use phrases like "Here's something that caught my eye..." or "You'll want to pay attention to this part..."
   - Explain WHY each red flag matters in practical terms
   - Give real-world examples when possible


5. **Discusses money matters clearly**: 
   - "Let's talk about what this will cost you..."
   - Break down all fees, penalties, and financial commitments
   - Explain payment terms in simple language


6. **Explains the "what ifs"**: 
   - What happens if they want to cancel?
   - What if there's a dispute?
   - What if they don't meet their obligations?


7. **Provides actionable advice**:
   - "If I were you, I'd consider..."
   - "You might want to negotiate..."
   - "Make sure you understand..."


8. **Closes with key takeaways**: 
   - "So, bottom line..."
   - "The three things to remember are..."


Guidelines for natural speech:
- Use contractions (you'll, doesn't, here's, that's)
- Add natural pauses with commas and ellipses
- Include conversational phrases ("Now, here's the thing...", "So basically...", "To be honest...")
- Vary sentence length - mix short punchy statements with longer explanations
- Use analogies to explain complex concepts
- Include slight redundancy that occurs in natural speech
- Add emphasis naturally ("This is really important...", "Pay special attention to...")


CRITICAL FORMATTING RULES:
- Write in flowing paragraphs only
- No bullet points, numbered lists, or special formatting
- No asterisks, hashtags, dashes, or other markdown symbols
- Everything should sound natural when read aloud by text-to-speech
- Use "first", "second", "third" instead of numbered lists
- Use "also" and "another thing" to transition between points


Length: 4-6 minutes of natural conversation (600-800 words)


Remember: Make it sound like a knowledgeable friend explaining things over coffee, not a robot reading a legal brief. Be warm, helpful, and genuinely concerned about helping them understand what they're signing.


Return ONLY the conversational script with no formatting whatsoever."""
    
    try:
        responses = model.generate_content([
            "Document requiring explanation:", document, prompt
        ], stream=True)
        
        response_text = ""
        for response in responses:
            response_text += response.text
        
        # Clean up any remaining markdown or special characters
        cleaned_text = clean_text_for_tts(response_text.strip())
        
        return cleaned_text
        
    except Exception as e:
        print(f"⚠️ Script generation error: {e}")
        return ""



def generate_audio_with_gemini_tts(text: str, voice_name: str = "Achernar") -> str:
    """Generate audio using Google Cloud TTS with Gemini 2.5 Flash Preview"""
    try:
        print("🔐 Using Google Cloud TTS API...")
        
        # Get fresh access token using gcloud command
        import subprocess
        result = subprocess.run(['gcloud', 'auth', 'print-access-token'], 
                               capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"Failed to get access token: {result.stderr}")
            
        access_token = result.stdout.strip()
        print(f"✅ Got fresh access token: {access_token[:50]}...")
        
        # Split text into chunks
        text_chunks = split_text_into_chunks(text, max_chars=800)
        print(f"📄 Processing {len(text_chunks)} text chunks...")
        
        if voice_name == "Achernar":
            print("🎭 **ACHERNAR MODE**: Will retry with aggressive rate limiting for 100% Achernar voice")
        
        audio_contents = []
        
        for i, chunk in enumerate(text_chunks, 1):
            print(f"🎵 Synthesizing chunk {i}/{len(text_chunks)} with {voice_name}...")
            print(f"🔍 Chunk size: {len(chunk)} characters ({len(chunk.encode('utf-8'))} bytes)")
            
            # Use Achernar with retry logic
            if voice_name == "Achernar":
                success = False
                max_retries = 5
                retry_delays = [5, 10, 15, 30, 60]  # Progressive delays in seconds
                
                for attempt in range(max_retries):
                    print(f"🎭 Attempting Achernar (attempt {attempt + 1}/{max_retries})...")
                    
                    url = "https://texttospeech.googleapis.com/v1beta1/text:synthesize"
                    request_body = {
                        "audioConfig": {
                            "audioEncoding": "MP3",
                            "pitch": -1.0,
                            "speakingRate": 1.0
                        },
                        "input": {
                            "text": chunk
                        },
                        "voice": {
                            "languageCode": "en-US",
                            "modelName": "gemini-2.5-flash-preview-tts",
                            "name": "Achernar"
                        }
                    }
                    
                    headers = {
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                    
                    response = requests.post(url, headers=headers, json=request_body)
                    
                    if response.status_code == 200:
                        audio_data = response.json()
                        audio_contents.append(audio_data['audioContent'])
                        print(f"✅ Chunk {i} synthesized successfully with Achernar!")
                        success = True
                        break
                    
                    elif response.status_code == 429:
                        if attempt < max_retries - 1:  # Don't wait after last attempt
                            delay = retry_delays[attempt]
                            print(f"⏱️ Quota exceeded. Waiting {delay} seconds before retry...")
                            time.sleep(delay)
                        else:
                            print("❌ Max retries exceeded for Achernar")
                    
                    else:
                        print(f"⚠️ TTS API error: {response.status_code} - {response.text}")
                        break
                
                if not success:
                    raise Exception("Failed to synthesize chunk with Achernar after all retries")
                
                # Add significant delay between successful Achernar requests
                if i < len(text_chunks):
                    delay = 8  # 8 seconds between chunks to avoid quota
                    print(f"⏱️ Waiting {delay} seconds to respect Achernar rate limits...")
                    time.sleep(delay)
            
            else:
                # Standard voice processing (Neural2-F, etc.)
                url = "https://texttospeech.googleapis.com/v1/text:synthesize"
                request_body = {
                    "audioConfig": {
                        "audioEncoding": "MP3",
                        "pitch": -1.0,
                        "speakingRate": 1.0
                    },
                    "input": {
                        "text": chunk
                    },
                    "voice": {
                        "languageCode": "en-US",
                        "name": voice_name
                    }
                }
                
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                
                response = requests.post(url, headers=headers, json=request_body)
                
                if response.status_code == 200:
                    audio_data = response.json()
                    audio_contents.append(audio_data['audioContent'])
                    print(f"✅ Chunk {i} synthesized successfully with {voice_name}")
                else:
                    raise Exception(f"TTS API error: {response.text}")
                
                if i < len(text_chunks):
                    time.sleep(0.5)
        
        print("🔗 Combining audio chunks...")
        combined_audio = b''.join([base64.b64decode(content) for content in audio_contents])
        
        total_time = len(text_chunks) * 8  # Estimate total wait time
        if voice_name == "Achernar":
            print(f"🎭 **100% ACHERNAR SUCCESS!** (Total processing time: ~{total_time//60} minutes)")
        
        return base64.b64encode(combined_audio).decode('utf-8')
        
    except Exception as e:
        print(f"⚠️ Audio generation error: {e}")
        import traceback
        traceback.print_exc()
        return ""



def upload_audio_to_gcs(audio_content: str, filename: str) -> str:
    """Upload audio file to Google Cloud Storage"""
    try:
        client = storage.Client(project=PROJECT_ID)
        bucket = client.bucket(PODCAST_BUCKET)
        blob = bucket.blob(filename)
        
        audio_data = base64.b64decode(audio_content)
        blob.upload_from_string(audio_data, content_type='audio/mp3')
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"⚠️ Upload error: {e}")
        return ""



def create_legal_document_audio_explanation(document_uri: str, voice_preference: str = "Achernar") -> Dict:
    """Generate comprehensive legal document explanation in natural audio format"""
    
    print(f"⚖️ Creating legal document audio explanation from: {document_uri}")
    print("🔍 Analyzing document for risks and important clauses...")
    
    # Determine MIME type based on file extension
    if document_uri.lower().endswith('.pdf'):
        mime_type = "application/pdf"
    elif document_uri.lower().endswith('.docx'):
        mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif document_uri.lower().endswith('.doc'):
        mime_type = "application/msword"
    else:
        mime_type = "application/pdf"  # Default
    
    # Handle GCS URL directly or upload local file to GCS
    if document_uri.startswith("gs://"):
        print("☁️ GCS URL detected...")
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
    
    # Analyze document for risks and red flags
    print("⚠️ Identifying risks and red flags...")
    risk_analysis = analyze_legal_risks(document)
    
    if risk_analysis:
        print(f"📄 Document type: {risk_analysis.get('document_type', 'Legal Document')}")
        print(f"📋 Topics covered: {len(risk_analysis.get('topics_covered', []))} topics identified")
        print(f"🚨 Found {len(risk_analysis.get('high_risk_items', []))} high-risk items")
        print(f"🔴 Found {len(risk_analysis.get('red_flags', []))} red flags")
        print(f"💰 Found {len(risk_analysis.get('financial_obligations', []))} financial obligations")
        print(f"📅 Found {len(risk_analysis.get('key_dates', []))} key dates")
        print(f"✅ Found {len(risk_analysis.get('favorable_terms', []))} favorable terms")
        print(f"📋 Generated {len(risk_analysis.get('action_items', []))} action items")
        print(f"🎯 Overall risk level: {risk_analysis.get('overall_risk_level', 'MEDIUM')}")
    
    print("📝 Generating natural explanation script...")
    explanation_script = generate_legal_explanation_script(document, risk_analysis)
    
    if not explanation_script:
        print("⚠️ Failed to generate explanation script")
        return {
            "success": False,
            "message": "Failed to generate document explanation.",
            "audio_url": "",
            "document_details": {}
        }
    
    print("✅ Legal explanation script generated successfully!")
    print(f"📊 Script length: ~{len(explanation_script.split())} words")
    
    print(f"🎙️ Converting to audio with natural voice ({voice_preference})...")
    audio_content = generate_audio_with_gemini_tts(explanation_script, voice_preference)
    
    if not audio_content:
        print("⚠️ Failed to generate audio")
        return {
            "success": False,
            "message": "Failed to generate audio explanation.",
            "audio_url": "",
            "document_details": {}
        }
    
    # Generate filename based on document
    doc_name = os.path.basename(document_uri).split('.')[0]
    filename = f"{doc_name}_Legal_Explanation_{int(time.time())}.mp3"
    
    print("☁️ Uploading audio to cloud storage...")
    url = upload_audio_to_gcs(audio_content, filename)
    
    if url:
        result = {
            "success": True,
            "message": "Legal document audio explanation generated successfully.",
            "audio_url": url,
            "document_details": {
                "document_type": risk_analysis.get('document_type', 'Legal Document'),
                "document_purpose": risk_analysis.get('document_purpose', 'Legal agreement analysis'),
                "topics_covered": risk_analysis.get('topics_covered', []),
                "overall_risk_level": risk_analysis.get('overall_risk_level', 'MEDIUM'),
                "risk_summary": {
                    "high_risk_items": len(risk_analysis.get('high_risk_items', [])),
                    "red_flags": len(risk_analysis.get('red_flags', [])),
                    "financial_obligations": risk_analysis.get('financial_obligations', []),
                    "key_dates": risk_analysis.get('key_dates', []),
                    "favorable_terms": risk_analysis.get('favorable_terms', []),
                    "action_items": risk_analysis.get('action_items', []),
                    "termination_clauses": risk_analysis.get('termination_clauses', []),
                    "liability_issues": risk_analysis.get('liability_issues', []),
                    "ip_rights": risk_analysis.get('ip_rights', []),
                    "dispute_resolution": risk_analysis.get('dispute_resolution', []),
                    "confidentiality_terms": risk_analysis.get('confidentiality_terms', []),
                    "compliance_requirements": risk_analysis.get('compliance_requirements', [])
                },
                "detailed_analysis": {
                    "high_risk_items_detailed": risk_analysis.get('high_risk_items', []),
                    "red_flags_detailed": risk_analysis.get('red_flags', []),
                    "all_identified_risks": {
                        "financial": risk_analysis.get('financial_obligations', []),
                        "termination": risk_analysis.get('termination_clauses', []),
                        "liability": risk_analysis.get('liability_issues', []),
                        "intellectual_property": risk_analysis.get('ip_rights', []),
                        "disputes": risk_analysis.get('dispute_resolution', []),
                        "confidentiality": risk_analysis.get('confidentiality_terms', []),
                        "compliance": risk_analysis.get('compliance_requirements', [])
                    }
                },
                "audio_details": {
                    "word_count": len(explanation_script.split()),
                    "voice_used": voice_preference,
                    "style": "Natural, conversational legal explanation",
                    "estimated_duration": f"{len(explanation_script.split()) / 150:.1f} minutes"
                },
                "analysis_metadata": {
                    "analysis_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "total_topics_identified": len(risk_analysis.get('topics_covered', [])),
                    "comprehensive_analysis": True,
                    "voice_synthesis_method": "Gemini 2.5 Flash Preview TTS" if voice_preference == "Achernar" else "Standard Google TTS"
                }
            }
        }
        print(f"✅ Legal audio explanation ready: {url}")
        print(f"📊 Comprehensive analysis complete with {len(risk_analysis.get('topics_covered', []))} topics")
        return result
    else:
        print("⚠️ Upload failed")
        return {
            "success": False,
            "message": "Failed to upload audio to cloud storage.",
            "audio_url": "",
            "document_details": {}
        }



if __name__ == "__main__":
    print("⚖️ Legal Document Audio Demystifier Ready!")
    print("🎙️ Using Gemini 2.5 Flash Preview TTS for natural voice synthesis")
