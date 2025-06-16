import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Upload, FileText, Brain, Zap, Clock, Trophy, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_BASE_URL = 'http://localhost:8001';

export default function Home() {
  const [file, setFile] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [dragActive, setDragActive] = useState(false);
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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setMessage('');
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
      
      setTimeout(() => {
        router.push(`/quiz/${response.data.quiz_id}`);
      }, 2000);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="relative z-10">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4 py-16"
        >
          <div className="text-center mb-16">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full px-6 py-2 mb-6 border border-blue-500/30"
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">AI-Powered MCQ Generation</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-6xl md:text-7xl font-bold mb-6"
            >
              <span className="gradient-text">MCQ</span>
              <span className="text-white"> Generator</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              Transform your documents into engaging multiple-choice questions with the power of AI. 
              Upload any PDF, text file, or image and get instant, high-quality MCQs.
            </motion.p>

            {/* Feature Pills */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-4 mb-12"
            >
              {[
                { icon: Brain, text: "AI-Powered" },
                { icon: Zap, text: "Instant Results" },
                { icon: FileText, text: "Multiple Formats" },
                { icon: Clock, text: "Save Time" }
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                  <feature.icon className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">{feature.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="glass-card glow-effect">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl gradient-text">Generate Your MCQs</CardTitle>
                <CardDescription className="text-gray-400">
                  Upload your content and let AI create perfect questions for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* File Upload Area */}
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="text-sm font-medium text-gray-300">
                      Upload File (PDF, TXT, or Image)
                    </Label>
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                        dragActive 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".pdf,.txt,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        disabled={loading}
                      />
                      <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-300">
                            {file ? file.name : 'Drop your file here or click to browse'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Supports PDF, TXT, JPG, PNG files
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Number of Questions */}
                  <div className="space-y-2">
                    <Label htmlFor="num-questions" className="text-sm font-medium text-gray-300">
                      Number of Questions (1-20)
                    </Label>
                    <Input
                      id="num-questions"
                      type="number"
                      min="1"
                      max="20"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      disabled={loading}
                      className="bg-white/5 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="gradient"
                    size="lg"
                    disabled={loading || !file}
                    className="w-full text-lg py-6 relative overflow-hidden group"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating MCQs...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        Generate MCQs
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </form>

                {/* Loading Animation */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4"
                  >
                    <div className="inline-flex items-center gap-3 text-blue-400">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">AI is analyzing your content...</p>
                  </motion.div>
                )}

                {/* Message */}
                {message && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-lg border ${
                      messageType === 'success' 
                        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}
                  >
                    {message}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Quizzes */}
          {recentQuizzes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="max-w-4xl mx-auto mt-16"
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Recent Quizzes
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Your recently generated MCQ sets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {recentQuizzes.map((quiz, index) => (
                      <motion.div
                        key={quiz.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        onClick={() => handleQuizClick(quiz.id)}
                        className="group p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 cursor-pointer transition-all duration-300 hover-lift"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {quiz.title}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                              {quiz.total_questions} questions • Created {new Date(quiz.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}