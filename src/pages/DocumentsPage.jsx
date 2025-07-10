import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DocumentsPage = () => {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalDocuments, setTotalDocuments] = useState(0)

  const documentsPerPage = 10

  useEffect(() => {
    fetchDocuments()
  }, [currentPage])

  const fetchDocuments = async () => {
    try {
      setLoading(true)

      // Get total count
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })

      setTotalDocuments(count || 0)

      // Get paginated documents
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false })
        .range((currentPage - 1) * documentsPerPage, currentPage * documentsPerPage - 1)

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentSelect = (document) => {
    navigate(`/view/${document.id}`, { state: { document } })
  }

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Refresh the current page
      await fetchDocuments()
      alert('Document deleted successfully!')
    } catch (error) {
      console.error('Error deleting document:', error)
      alert(`Error deleting document: ${error.message}`)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPreview = (content) => {
    if (!content) return 'No content'

    let text = ''

    // Handle uploaded file content (new structure)
    if (typeof content === 'object' && content.type === 'uploaded_file') {
      text = content.original_content || ''
    }
    // Handle string content
    else if (typeof content === 'string') {
      text = content
    }
    // Handle Tiptap JSON content
    else if (typeof content === 'object' && content.content) {
      const extractText = (node) => {
        if (node.type === 'text') {
          text += node.text + ' '
        } else if (node.content) {
          node.content.forEach(extractText)
        }
      }
      content.content.forEach(extractText)
    }
    // Fallback for other object types
    else if (typeof content === 'object') {
      text = JSON.stringify(content)
    }

    // Clean up the text and get first 10 words
    text = text.trim().replace(/\s+/g, ' ') // Replace multiple spaces with single space

    if (!text) return 'No content'

    const words = text.split(' ')
    if (words.length <= 10) {
      return text
    }

    return words.slice(0, 10).join(' ') + '...'
  }

  const totalPages = Math.ceil(totalDocuments / documentsPerPage)

  return (
    <div className="h-screen bg-gradient-to-br from-slate-700 via-gray-800 to-slate-700 flex flex-col p-4">
      {/* Top Navigation */}
      <div className="flex gap-6 mb-8">
        <button
          onClick={() => navigate('/editor')}
          className="text-white/90 hover:text-white text-sm font-medium"
        >
          Home
        </button>
        <button className="text-white/90 hover:text-white text-sm font-medium">
          Documents
        </button>
        <button
          onClick={() => navigate('/ask')}
          className="text-sky-300 hover:text-sky-200 text-sm font-medium"
        >
          Ask AI
        </button>
        <button
          onClick={() => navigate('/knowledge')}
          className="text-emerald-300 hover:text-emerald-200 text-sm font-medium"
        >
          Knowledge Graph
        </button>
        <button
          onClick={() => navigate('/search')}
          className="text-yellow-300 hover:text-yellow-200 text-sm font-medium"
        >
          Search
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          {loading ? (
            <div className="text-center text-white/60 py-12">
              <div className="inline-flex items-center">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
                Loading documents...
              </div>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-12">
              <div className="text-lg mb-2">Error loading documents</div>
              <div className="text-sm">{error}</div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center text-white/60 py-12">
              <div className="text-lg mb-2">No documents found</div>
              <div className="text-sm mb-4">Create your first document in the editor!</div>
              <button
                onClick={() => navigate('/editor')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Go to Editor
              </button>
            </div>
          ) : (
            <>
              {/* Documents List - One per row */}
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white/10 border border-white/20 rounded-lg p-4 hover:bg-white/15 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 cursor-pointer" onClick={() => handleDocumentSelect(doc)}>
                        <h3 className="text-lg font-medium text-blue-300 mb-2 hover:text-blue-200 transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-white/70 text-sm mb-2">
                          {getPreview(doc.content)}
                        </p>
                        <p className="text-white/50 text-xs">
                          {formatDate(doc.updated_at)}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleDocumentSelect(doc)}
                          className="bg-blue-500/30 text-white border border-blue-400/50 px-3 py-2 rounded text-sm hover:bg-blue-500/50 transition-colors"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="bg-red-500/30 text-white border border-red-400/50 px-3 py-2 rounded text-sm hover:bg-red-500/50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          currentPage === page
                            ? 'bg-blue-500/30 border border-blue-400/50 text-white'
                            : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Document Count */}
              <div className="text-center text-white/50 text-sm mt-4">
                Showing {((currentPage - 1) * documentsPerPage) + 1} to {Math.min(currentPage * documentsPerPage, totalDocuments)} of {totalDocuments} documents
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default DocumentsPage
