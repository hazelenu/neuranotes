import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { askDocumentQuestion } from '../lib/rag'
import { getDemoAnswer, hasDemoAnswers } from '../data/demoAnswers'

const RAGPage = () => {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])

  // Load documents on component mount
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error('Error loading documents:', err)
      setError('Failed to load documents')
    }
  }

  const handleDocumentSelect = (doc) => {
    setSelectedDocument(doc)
    setConversationHistory([])
    setAnswer('')
    setError('')
    setQuestion('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!question.trim()) {
      setError('Please enter a question')
      return
    }

    if (!selectedDocument) {
      setError('Please select a document first')
      return
    }

    setIsLoading(true)
    setError('')

    // Check if we can provide a demo answer
    const canUseDemoAnswer = hasDemoAnswers(selectedDocument.title)

    if (canUseDemoAnswer) {
      // Use demo answer for default documents
      setTimeout(() => {
        const demoAnswer = getDemoAnswer(selectedDocument.title, question.trim())

        const newEntry = {
          question: question.trim(),
          answer: demoAnswer,
          timestamp: new Date().toLocaleTimeString(),
          isDemo: true
        }

        setConversationHistory(prev => [...prev, newEntry])
        setAnswer('') // Clear current answer since it's now in history
        setQuestion('')
        setIsLoading(false)
      }, 1000) // Simulate API delay
      return
    }

    try {
      const result = await askDocumentQuestion(question.trim(), selectedDocument.id)

      if (result.success) {
        const newEntry = {
          question: question.trim(),
          answer: result.answer,
          timestamp: new Date().toLocaleTimeString()
        }

        setConversationHistory(prev => [...prev, newEntry])
        setAnswer('') // Clear current answer since it's now in history
        setQuestion('')
      } else {
        // Improved error message
        if (result.error && result.error.includes('non-JSON response')) {
          setError('OpenAI API is not available. This demo works with the default documents above, or you can set up your OpenAI API key to use this feature with your own documents.')
        } else {
          setError(result.error || 'Unable to process your question. Please try again or select one of the default documents for a demo experience.')
        }
      }
    } catch (err) {
      console.error('RAG error:', err)

      // Better error handling
      if (err.message && err.message.includes('fetch')) {
        setError('OpenAI API is not available. This demo works with the default documents above, or you can set up your OpenAI API key to use this feature.')
      } else {
        setError('Unable to process your question at this time. Please try selecting one of the default documents for a demo experience.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const sampleQuestions = [
    "What is the main topic of this document?",
    "Can you summarize the key points?",
    "What challenges are mentioned?",
    "What solutions are proposed?",
    "What are the most important takeaways?"
  ]

  return (
    <div className="h-screen bg-gradient-to-br from-slate-700 via-gray-800 to-slate-700 flex flex-col">
      {/* Header */}
      <div className="bg-white/10 border-b border-white/20 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/editor')}
            className="text-white/90 hover:text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-white">
            <span className="italic text-white">Ask</span>
            <span className="text-sky-300 ml-1">AI</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Document Sidebar */}
        <div className="w-80 bg-white/5 border-r border-white/20 p-4 overflow-y-auto">
          <h2 className="text-lg font-medium text-white mb-4">Select Document</h2>
          
          {documents.length === 0 ? (
            <div className="text-white/70 text-center py-8">
              <p>No documents found.</p>
              <button
                onClick={() => navigate('/editor')}
                className="text-sky-300 hover:text-sky-200 mt-2"
              >
                Upload a document first
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleDocumentSelect(doc)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedDocument?.id === doc.id
                      ? 'bg-blue-500/30 border border-blue-400/50'
                      : 'bg-white/10 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  <div className={`font-medium ${
                    selectedDocument?.id === doc.id
                      ? 'text-white'
                      : 'text-sky-300'
                  }`}>
                    {doc.title}
                  </div>
                  <div className="text-sm text-white/60">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedDocument ? (
            <>
              {/* Document Header */}
              <div className="bg-white/5 border-b border-white/20 p-4">
                <h2 className="text-lg font-medium text-white">
                  Asking about: {selectedDocument.title}
                </h2>
              </div>

              {/* Conversation Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversationHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-white/70 mb-6">
                      <h3 className="text-lg font-medium mb-2">Ask questions about this document</h3>
                      <p>Use AI to get insights, summaries, and answers from your document content.</p>
                    </div>
                    
                    <div className="max-w-md mx-auto">
                      <h4 className="text-white/90 font-medium mb-3">Try these sample questions:</h4>
                      <div className="space-y-2">
                        {sampleQuestions.map((sample, index) => (
                          <button
                            key={index}
                            onClick={() => setQuestion(sample)}
                            className="block w-full text-left text-sm text-sky-300 hover:text-sky-200 hover:bg-white/10 p-2 rounded transition-colors"
                          >
                            "{sample}"
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {conversationHistory.map((entry, index) => (
                      <div key={index} className="space-y-3">
                        {/* Question */}
                        <div className="flex justify-end">
                          <div className="bg-blue-500/30 border border-blue-400/50 rounded-lg p-3 max-w-2xl">
                            <p className="text-white">{entry.question}</p>
                            <p className="text-white/60 text-xs mt-1">{entry.timestamp}</p>
                          </div>
                        </div>
                        
                        {/* Answer */}
                        <div className="flex justify-start">
                          <div className="bg-white/10 border border-white/20 rounded-lg p-3 max-w-2xl">
                            <p className="text-white/90 whitespace-pre-wrap">{entry.answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Answer (if loading or just answered) */}
                {(isLoading || answer) && (
                  <div className="space-y-3">
                    {question && (
                      <div className="flex justify-end">
                        <div className="bg-blue-500/30 border border-blue-400/50 rounded-lg p-3 max-w-2xl">
                          <p className="text-white">{question}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-start">
                      <div className="bg-white/10 border border-white/20 rounded-lg p-3 max-w-2xl">
                        {isLoading ? (
                          <div className="flex items-center text-white/70">
                            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Thinking...
                          </div>
                        ) : (
                          <p className="text-white/90 whitespace-pre-wrap">{answer}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Question Input */}
              <div className="bg-white/5 border-t border-white/20 p-4">
                {error && (
                  <div className="mb-3 p-3 bg-red-500/20 border border-red-400/50 rounded-lg">
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about this document..."
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    className="bg-blue-500/30 text-white border border-blue-400/50 px-6 py-2 rounded-lg hover:bg-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Asking...' : 'Ask'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white/70">
                <h3 className="text-xl font-medium mb-2">Select a document to start asking questions</h3>
                <p>Choose a document from the sidebar to begin your AI-powered Q&A session.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RAGPage
