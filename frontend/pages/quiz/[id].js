import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001';

export default function Quiz() {
  const router = useRouter();
  const { id } = router.query;
  
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuiz();
    }
  }, [id]);

  const fetchQuiz = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/quiz/${id}`);
      setQuiz(response.data.quiz);
      setQuestions(response.data.questions);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      alert('Error loading quiz');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/quiz/${id}/submit`, answers);
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setAnswers({});
    setResults(null);
    setShowResults(false);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="container">
        <div className="card">
          <h2>Quiz not found</h2>
          <button 
            className="btn btn-primary" 
            onClick={() => router.push('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>{quiz.title}</h1>
          <button 
            className="btn btn-secondary" 
            onClick={() => router.push('/')}
          >
            Back to Home
          </button>
        </div>
        
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Total Questions: {quiz.total_questions}
        </p>

        {showResults && (
          <div className="score-summary">
            <h2>Quiz Results</h2>
            <div className="score-number">{results.score}/{results.total_questions}</div>
            <p style={{ fontSize: '18px' }}>{results.percentage}% Score</p>
            <button 
              className="btn btn-secondary" 
              onClick={resetQuiz}
              style={{ marginTop: '16px' }}
            >
              Take Again
            </button>
          </div>
        )}
      </div>

      {questions.map((question) => (
        <div key={question.id} className="card question-card">
          <div className="question-number">
            Question {question.question_number}
          </div>
          
          <div className="question-text">
            {question.question_text}
          </div>

          <div className="options">
            {Object.entries(question.options).map(([optionKey, optionText]) => {
              const isSelected = answers[question.id] === optionKey;
              const isCorrect = showResults && optionKey === question.correct_answer;
              const isIncorrect = showResults && isSelected && optionKey !== question.correct_answer;
              
              let className = 'option';
              if (showResults) {
                if (isCorrect) className += ' correct';
                else if (isIncorrect) className += ' incorrect';
              } else if (isSelected) {
                className += ' selected';
              }

              return (
                <label key={optionKey} className={className}>
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={optionKey}
                    checked={isSelected}
                    onChange={() => handleAnswerChange(question.id, optionKey)}
                    disabled={showResults}
                  />
                  <strong>{optionKey}:</strong> {optionText}
                </label>
              );
            })}
          </div>

          {showResults && question.explanation && (
            <div className="explanation">
              <strong>Explanation:</strong> {question.explanation}
            </div>
          )}
        </div>
      ))}

      {!showResults && (
        <div className="card" style={{ textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length < questions.length}
            style={{ fontSize: '18px', padding: '16px 32px' }}
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
          
          <p style={{ marginTop: '16px', color: '#666' }}>
            Answered: {Object.keys(answers).length} / {questions.length}
          </p>
        </div>
      )}
    </div>
  );
}