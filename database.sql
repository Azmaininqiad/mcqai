-- MCQ Generator Database Schema for Supabase
-- Run these commands in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    source_file VARCHAR(255),
    total_questions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Optional metadata
    description TEXT,
    tags TEXT[],
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    estimated_time_minutes INTEGER,
    
    -- User tracking (if you want to add user authentication later)
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    
    -- Options
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    
    -- Correct answer and explanation
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(quiz_id, question_number)
);

-- Create quiz_attempts table (for tracking user attempts)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Attempt details
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    score INTEGER DEFAULT 0,
    total_questions INTEGER NOT NULL,
    time_taken_seconds INTEGER,
    
    -- Session info
    session_id UUID DEFAULT uuid_generate_v4(),
    ip_address INET,
    user_agent TEXT
);

-- Create user_answers table (for tracking individual question answers)
CREATE TABLE IF NOT EXISTS public.user_answers (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    
    -- Answer details
    selected_answer CHAR(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN,
    time_taken_seconds INTEGER,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(attempt_id, question_id)
);

-- Create file_uploads table (for tracking uploaded files)
CREATE TABLE IF NOT EXISTS public.file_uploads (
    id BIGSERIAL PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    storage_filename VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    storage_path TEXT,
    
    -- File processing status
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Associated quiz (if MCQs were generated from this file)
    generated_quiz_id BIGINT REFERENCES public.quizzes(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_question ON public.questions(quiz_id, question_number);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_attempt_id ON public.user_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON public.user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON public.file_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON public.quizzes(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON public.quizzes;
CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON public.quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Public read access for quizzes and questions (modify as needed)
CREATE POLICY "Public read access for quizzes" ON public.quizzes
    FOR SELECT USING (true);

CREATE POLICY "Public read access for questions" ON public.questions
    FOR SELECT USING (true);

-- Users can create quizzes
CREATE POLICY "Users can create quizzes" ON public.quizzes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create questions" ON public.questions
    FOR INSERT WITH CHECK (true);

-- Users can update their own quizzes (if user tracking is enabled)
CREATE POLICY "Users can update own quizzes" ON public.quizzes
    FOR UPDATE USING (auth.uid() = created_by);

-- Users can view their own attempts
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create attempts" ON public.quiz_attempts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own attempts" ON public.quiz_attempts
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can manage their own answers
CREATE POLICY "Users can manage own answers" ON public.user_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quiz_attempts qa 
            WHERE qa.id = attempt_id 
            AND (qa.user_id = auth.uid() OR qa.user_id IS NULL)
        )
    );

-- File upload policies
CREATE POLICY "Users can view file uploads" ON public.file_uploads
    FOR SELECT USING (true);

CREATE POLICY "Users can create file uploads" ON public.file_uploads
    FOR INSERT WITH CHECK (true);

-- Create storage bucket policies (run in Supabase dashboard or via API)
-- You'll need to create this bucket in your Supabase Storage dashboard
-- and set appropriate policies

-- Useful views for analytics and reporting
CREATE OR REPLACE VIEW public.quiz_statistics AS
SELECT 
    q.id,
    q.title,
    q.total_questions,
    q.created_at,
    COUNT(DISTINCT qa.id) as total_attempts,
    COUNT(DISTINCT qa.user_id) as unique_users,
    ROUND(AVG(qa.score::numeric), 2) as average_score,
    ROUND(AVG(qa.time_taken_seconds::numeric / 60), 2) as average_time_minutes,
    MAX(qa.score) as highest_score,
    MIN(qa.score) as lowest_score
FROM public.quizzes q
LEFT JOIN public.quiz_attempts qa ON q.id = qa.quiz_id AND qa.completed_at IS NOT NULL
GROUP BY q.id, q.title, q.total_questions, q.created_at;

CREATE OR REPLACE VIEW public.question_difficulty AS
SELECT 
    q.id,
    q.quiz_id,
    q.question_number,
    q.question_text,
    COUNT(ua.id) as total_answers,
    COUNT(CASE WHEN ua.is_correct THEN 1 END) as correct_answers,
    CASE 
        WHEN COUNT(ua.id) = 0 THEN 0
        ELSE ROUND((COUNT(CASE WHEN ua.is_correct THEN 1 END)::numeric / COUNT(ua.id)) * 100, 2)
    END as success_rate_percentage,
    ROUND(AVG(ua.time_taken_seconds::numeric), 2) as average_time_seconds
FROM public.questions q
LEFT JOIN public.user_answers ua ON q.id = ua.question_id
GROUP BY q.id, q.quiz_id, q.question_number, q.question_text
ORDER BY q.quiz_id, q.question_number;

-- Sample data insert (optional - for testing)
-- INSERT INTO public.quizzes (title, total_questions, description, difficulty_level) 
-- VALUES ('Sample Quiz', 3, 'A sample quiz for testing', 'medium');

-- INSERT INTO public.questions (quiz_id, question_number, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)
-- VALUES 
-- (1, 1, 'What is the capital of France?', 'London', 'Berlin', 'Paris', 'Madrid', 'C', 'Paris is the capital and largest city of France.'),
-- (1, 2, 'Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'B', 'Mars is called the Red Planet due to iron oxide on its surface.'),
-- (1, 3, 'What is 2 + 2?', '3', '4', '5', '6', 'B', 'Basic arithmetic: 2 + 2 = 4.');

-- Grant necessary permissions (adjust as needed)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create a function to get quiz with questions (useful for API calls)
CREATE OR REPLACE FUNCTION get_quiz_with_questions(quiz_id_param BIGINT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'quiz', row_to_json(q),
        'questions', json_agg(
            json_build_object(
                'id', quest.id,
                'question_number', quest.question_number,
                'question_text', quest.question_text,
                'options', json_build_object(
                    'A', quest.option_a,
                    'B', quest.option_b,
                    'C', quest.option_c,
                    'D', quest.option_d
                ),
                'correct_answer', quest.correct_answer,
                'explanation', quest.explanation
            ) ORDER BY quest.question_number
        )
    )
    INTO result
    FROM public.quizzes q
    LEFT JOIN public.questions quest ON q.id = quest.quiz_id
    WHERE q.id = quiz_id_param
    GROUP BY q.id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;