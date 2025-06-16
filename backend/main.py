from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json
import time
import tempfile
from datetime import datetime
import google.generativeai as genai
from supabase import create_client, Client
from typing import List, Dict, Any

# Configuration with hardcoded values
class Config:
    def __init__(self):
        self.GEMINI_API_KEY = "AIzaSyBoUdOFtm6VgmUdzkiTM5bW67TJXc5zMk0"
        self.SUPABASE_URL = "https://mixwsmdaogjctmiwiogz.supabase.co"
        self.SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peHdzbWRhb2dqY3RtaXdpb2d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODcyNzksImV4cCI6MjA2NTU2MzI3OX0.6Mf_49GGiEPEyMdiadmjcDjLHo26M8GxPpMGmikFEAc"
        self.SUPABASE_BUCKET = "mcq-files"

# Initialize
app = FastAPI(title="MCQ Generator API", version="1.0.0")
config = Config()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
genai.configure(api_key=config.GEMINI_API_KEY)
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

class MCQGenerator:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
    def create_mcq_prompt(self, num_questions=5):
        return f"""
        Based on the provided content, generate exactly {num_questions} multiple-choice questions (MCQs).
        
        Requirements:
        1. Create diverse questions covering different aspects of the content
        2. Each question should have 4 options (A, B, C, D)
        3. Only one option should be correct
        4. Make questions challenging but fair
        5. Avoid trivial or overly obvious questions
        
        Format your response as a JSON array with this exact structure:
        [
            {{
                "question": "Question text here?",
                "options": {{
                    "A": "Option A text",
                    "B": "Option B text", 
                    "C": "Option C text",
                    "D": "Option D text"
                }},
                "correct_answer": "A",
                "explanation": "Brief explanation of why this is correct"
            }}
        ]
        
        Generate exactly {num_questions} questions in this format.
        """

    async def upload_to_supabase_storage(self, file_content: bytes, file_name: str):
        try:
            result = supabase.storage.from_(config.SUPABASE_BUCKET).upload(
                file_name, file_content, file_options={"content-type": "auto"}
            )
            return True
        except Exception as e:
            print(f"Error uploading to Supabase storage: {e}")
            return False

    async def generate_mcqs(self, file_content: bytes, file_name: str, num_questions: int = 5):
        try:
            # Save file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_name)[1]) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            # Upload file to Gemini
            file = genai.upload_file(temp_file_path)
            
            # Wait for file processing
            while file.state.name == "PROCESSING":
                time.sleep(2)
                file = genai.get_file(file.name)
            
            if file.state.name == "FAILED":
                raise ValueError("File processing failed")
            
            # Generate MCQs
            prompt = self.create_mcq_prompt(num_questions)
            response = self.model.generate_content([file, prompt])
            
            # Clean and parse response
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            mcqs = json.loads(response_text)
            
            # Clean up
            genai.delete_file(file.name)
            os.unlink(temp_file_path)
            
            return mcqs
            
        except Exception as e:
            print(f"Error generating MCQs: {e}")
            raise HTTPException(status_code=500, detail=f"Error generating MCQs: {str(e)}")

    async def save_mcqs_to_supabase(self, mcqs: List[Dict], file_name: str, original_filename: str):
        try:
            # Insert quiz record
            quiz_data = {
                "title": f"Quiz from {original_filename}",
                "source_file": file_name,
                "total_questions": len(mcqs),
                "created_at": datetime.now().isoformat()
            }
            
            quiz_result = supabase.table("quizzes").insert(quiz_data).execute()
            quiz_id = quiz_result.data[0]["id"]
            
            # Insert questions
            for i, mcq in enumerate(mcqs):
                question_data = {
                    "quiz_id": quiz_id,
                    "question_number": i + 1,
                    "question_text": mcq["question"],
                    "option_a": mcq["options"]["A"],
                    "option_b": mcq["options"]["B"],
                    "option_c": mcq["options"]["C"],
                    "option_d": mcq["options"]["D"],
                    "correct_answer": mcq["correct_answer"],
                    "explanation": mcq.get("explanation", "")
                }
                
                supabase.table("questions").insert(question_data).execute()
            
            return quiz_id
            
        except Exception as e:
            print(f"Error saving to database: {e}")
            raise HTTPException(status_code=500, detail=f"Error saving to database: {str(e)}")

# Initialize generator
generator = MCQGenerator()

@app.get("/")
async def root():
    return {"message": "MCQ Generator API is running"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    num_questions: int = Form(5)
):
    try:
        # Validate file type
        allowed_types = ["application/pdf", "text/plain", "image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Validate number of questions
        if not 1 <= num_questions <= 20:
            raise HTTPException(status_code=400, detail="Number of questions must be between 1 and 20")
        
        # Read file content
        file_content = await file.read()
        
        # Generate unique filename for storage
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        storage_filename = f"{timestamp}_{file.filename}"
        
        # Upload to Supabase storage
        await generator.upload_to_supabase_storage(file_content, storage_filename)
        
        # Generate MCQs
        mcqs = await generator.generate_mcqs(file_content, file.filename, num_questions)
        
        # Save to database
        quiz_id = await generator.save_mcqs_to_supabase(mcqs, storage_filename, file.filename)
        
        return {
            "message": "File uploaded and MCQs generated successfully",
            "quiz_id": quiz_id,
            "total_questions": len(mcqs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/quiz/{quiz_id}")
async def get_quiz(quiz_id: int):
    try:
        # Get quiz info
        quiz_result = supabase.table("quizzes").select("*").eq("id", quiz_id).execute()
        if not quiz_result.data:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        quiz = quiz_result.data[0]
        
        # Get questions
        questions_result = supabase.table("questions").select("*").eq("quiz_id", quiz_id).order("question_number").execute()
        
        # Format questions for frontend
        questions = []
        for q in questions_result.data:
            questions.append({
                "id": q["id"],
                "question_number": q["question_number"],
                "question_text": q["question_text"],
                "options": {
                    "A": q["option_a"],
                    "B": q["option_b"],
                    "C": q["option_c"],
                    "D": q["option_d"]
                },
                "correct_answer": q["correct_answer"],
                "explanation": q["explanation"]
            })
        
        return {
            "quiz": quiz,
            "questions": questions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/quiz/{quiz_id}/submit")
async def submit_quiz(quiz_id: int, answers: Dict[str, str]):
    try:
        # Get correct answers
        questions_result = supabase.table("questions").select("*").eq("quiz_id", quiz_id).execute()
        
        correct_answers = {}
        explanations = {}
        for q in questions_result.data:
            correct_answers[str(q["id"])] = q["correct_answer"]
            explanations[str(q["id"])] = q["explanation"]
        
        # Calculate score
        score = 0
        results = {}
        
        for question_id, user_answer in answers.items():
            is_correct = user_answer == correct_answers.get(question_id)
            if is_correct:
                score += 1
            
            results[question_id] = {
                "user_answer": user_answer,
                "correct_answer": correct_answers.get(question_id),
                "is_correct": is_correct,
                "explanation": explanations.get(question_id)
            }
        
        return {
            "score": score,
            "total_questions": len(correct_answers),
            "percentage": round((score / len(correct_answers)) * 100, 2),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/quizzes")
async def get_recent_quizzes():
    try:
        result = supabase.table("quizzes").select("*").order("created_at", desc=True).limit(10).execute()
        return {"quizzes": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)