import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle, XCircle, Trophy, RotateCcw, Brain, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (id) {
      fetchQuiz();
    }
  }, [id]);

  useEffect(() => {
    if (!showResults) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showResults]);

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
    setCurrentQuestion(0);
    setTimeElapsed(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (percentage) => {
    if (percentage >= 80) return 'from-green-500 to-emerald-500';
    if (percentage >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading quiz...</p>
        </motion.div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="glass-card max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <h2 className="text-2xl font-bold text-white mb-4">Quiz not found</h2>
            <Button onClick={() => router.push('/')} variant="gradient">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex items-center gap-4 text-gray-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeElapsed)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span>{Object.keys(answers).length}/{questions.length}</span>
            </div>
          </div>
        </motion.div>

        {/* Quiz Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card mb-8">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl gradient-text">{quiz.title}</CardTitle>
              <CardDescription className="text-gray-400 text-lg">
                {quiz.total_questions} Questions • Test your knowledge
              </CardDescription>
              <div className="mt-4">
                <Progress 
                  value={(Object.keys(answers).length / questions.length) * 100} 
                  className="h-2"
                />
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Results Summary */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-8"
            >
              <Card className="glass-card overflow-hidden">
                <div className={`bg-gradient-to-r ${getScoreGradient(results.percentage)} p-1`}>
                  <div className="bg-slate-900/90 rounded-lg">
                    <CardContent className="text-center py-8">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="mb-6"
                      >
                        <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                        <h2 className="text-4xl font-bold text-white mb-2">Quiz Complete!</h2>
                        <div className={`text-6xl font-bold ${getScoreColor(results.percentage)} mb-2`}>
                          {results.score}/{results.total_questions}
                        </div>
                        <p className="text-2xl text-gray-300">{results.percentage}% Score</p>
                      </motion.div>
                      
                      <div className="flex justify-center gap-8 mb-6 text-sm">
                        <div className="text-center">
                          <div className="text-green-400 font-bold text-xl">{results.score}</div>
                          <div className="text-gray-400">Correct</div>
                        </div>
                        <div className="text-center">
                          <div className="text-red-400 font-bold text-xl">{results.total_questions - results.score}</div>
                          <div className="text-gray-400">Incorrect</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-400 font-bold text-xl">{formatTime(timeElapsed)}</div>
                          <div className="text-gray-400">Time</div>
                        </div>
                      </div>
                      
                      <Button onClick={resetQuiz} variant="gradient" size="lg">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Take Again
                      </Button>
                    </CardContent>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {question.question_number}
                    </div>
                    <CardTitle className="text-xl text-white">
                      Question {question.question_number}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-lg text-gray-300 leading-relaxed">
                    {question.question_text}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(question.options).map(([optionKey, optionText]) => {
                      const isSelected = answers[question.id] === optionKey;
                      const isCorrect = showResults && optionKey === question.correct_answer;
                      const isIncorrect = showResults && isSelected && optionKey !== question.correct_answer;
                      
                      let className = 'group relative p-4 rounded-lg border transition-all duration-300 cursor-pointer';
                      
                      if (showResults) {
                        if (isCorrect) {
                          className += ' bg-green-500/20 border-green-500/50 text-green-300';
                        } else if (isIncorrect) {
                          className += ' bg-red-500/20 border-red-500/50 text-red-300';
                        } else {
                          className += ' bg-white/5 border-gray-600 text-gray-300';
                        }
                      } else if (isSelected) {
                        className += ' bg-blue-500/20 border-blue-500/50 text-blue-300 glow-effect';
                      } else {
                        className += ' bg-white/5 border-gray-600 text-gray-300 hover:bg-white/10 hover:border-gray-500';
                      }

                      return (
                        <motion.label
                          key={optionKey}
                          className={className}
                          whileHover={{ scale: showResults ? 1 : 1.02 }}
                          whileTap={{ scale: showResults ? 1 : 0.98 }}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={optionKey}
                            checked={isSelected}
                            onChange={() => handleAnswerChange(question.id, optionKey)}
                            disabled={showResults}
                            className="sr-only"
                          />
                          
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-current' : 'border-gray-500'
                            }`}>
                              {isSelected && (
                                <div className="w-3 h-3 rounded-full bg-current" />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <span className="font-semibold mr-2">{optionKey}:</span>
                              <span>{optionText}</span>
                            </div>
                            
                            {showResults && isCorrect && (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            )}
                            {showResults && isIncorrect && (
                              <XCircle className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                        </motion.label>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <AnimatePresence>
                    {showResults && question.explanation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <Brain className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-blue-300 mb-1">Explanation</h4>
                            <p className="text-gray-300 leading-relaxed">{question.explanation}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Submit Button */}
        {!showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <Card className="glass-card">
              <CardContent className="py-8">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || Object.keys(answers).length < questions.length}
                  variant="gradient"
                  size="lg"
                  className="text-xl px-12 py-6"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Submit Quiz
                    </div>
                  )}
                </Button>
                
                <p className="text-gray-400 mt-4">
                  Answered: {Object.keys(answers).length} / {questions.length} questions
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}