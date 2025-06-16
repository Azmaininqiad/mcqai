import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001';

export default function Home() {
  const [file, setFile] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchRecentQuizzes();
  }, []);

  const fetchRecentQuizzes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/quizzes`);
      setRecentQuizzes(response.data.quizzes);
    } catch (error) {
      console.error('Error fetching recent quizzes:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setMessage('Please select a file');
      setMessageType('error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('num_questions', numQuestions);

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage(`MCQs generated successfully! Quiz ID: ${response.data.quiz_id}`);
      setMessageType('success');
      
      // Redirect to quiz page after 2 seconds
      setTimeout(() => {
        router.push(`/quiz/${response.data.quiz_id}`);
      }, 2000);

      // Refresh recent quizzes
      fetchRecentQuizzes();
      
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Error uploading file');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizClick = (quizId) => {
    router.push(`/quiz/${quizId}`);
  };

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
          MCQ Generator
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Upload File (PDF, TXT, or Image)
            </label>
            <input
              type="file"
              className="form-control"
              accept=".pdf,.txt,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Number of Questions (1-20)
            </label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="20"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !file}
            style={{ width: '100%' }}
          >
            {loading ? 'Generating MCQs...' : 'Generate MCQs'}
          </button>
        </form>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        )}

        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message}
          </div>
        )}
      </div>

      {recentQuizzes.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Recent Quizzes</h2>
          <ul className="quiz-list">
            {recentQuizzes.map((quiz) => (
              <li
                key={quiz.id}
                className="quiz-item"
                onClick={() => handleQuizClick(quiz.id)}
              >
                <div className="quiz-title">{quiz.title}</div>
                <div className="quiz-meta">
                  {quiz.total_questions} questions • Created {new Date(quiz.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}