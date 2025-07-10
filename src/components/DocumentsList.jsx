import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DocumentsList = ({ onDocumentSelect, onBack }) => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        throw error
      }

      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
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

      if (error) {
        throw error
      }

      // Remove from local state
      setDocuments(documents.filter(doc => doc.id !== id))
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
    // Extract text from Tiptap JSON content
    if (!content || !content.content) return 'No content'
    
    let text = ''
    const extractText = (node) => {
      if (node.type === 'text') {
        text += node.text
      } else if (node.content) {
        node.content.forEach(extractText)
      }
    }
    
    content.content.forEach(extractText)
    return text.substring(0, 100) + (text.length > 100 ? '...' : '')
  }

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-700 via-gray-800 to-slate-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading documents...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-700 via-gray-800 to-slate-700 flex items-center justify-center">
        <div className="text-white text-xl">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-700 via-gray-800 to-slate-700 flex flex-col p-4">
      {/* Top Navigation */}
      <div className="flex gap-6 mb-8">
        <button
          onClick={onBack}
          className="text-white/90 hover:text-white text-sm font-medium"
        >
          Home
        </button>
        <button className="text-white/90 hover:text-white text-sm font-medium">
          Documents
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">

        {/* Documents List */}
        {documents.length === 0 ? (
          <div className="text-center text-white/70 py-12">
            <p className="text-xl mb-4">No documents saved yet</p>
            <p>Create your first document in the editor!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white/10 border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-all duration-200"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => onDocumentSelect(doc)}>
                    <h3 className="text-lg font-medium text-sky-300 mb-2 hover:text-sky-200 transition-colors">{doc.title}</h3>
                    <p className="text-white/70 text-sm mb-2">{getPreview(doc.content)}</p>
                    <p className="text-white/50 text-xs">
                      Last updated: {formatDate(doc.updated_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onDocumentSelect(doc)}
                      className="bg-blue-500/30 text-white border border-blue-400/50 px-3 py-1 rounded text-sm hover:bg-blue-500/50 transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="bg-red-500/30 text-white border border-red-400/50 px-3 py-1 rounded text-sm hover:bg-red-500/50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default DocumentsList
