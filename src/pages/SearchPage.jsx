import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hybridSearch, keywordSearch, semanticSearch } from '../lib/hybridSearchVite'

const SearchPage = () => {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [searchStats, setSearchStats] = useState(null)
  const [searchMode, setSearchMode] = useState('hybrid')

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
    setResults([])
    setError('')
    setSearchStats(null)
  }

  const handleResultClick = async (result) => {
    try {
      // Get the document ID from the result
      const documentId = result.document_id || result.documentId
      if (!documentId) {
        console.error('No document ID found in result:', result)
        return
      }

      // Fetch the full document from the database
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error) {
        console.error('Error fetching document:', error)
        alert('Error opening document')
        return
      }

      if (!document) {
        console.error('Document not found:', documentId)
        alert('Document not found')
        return
      }

      // Navigate to the document viewer
      navigate(`/view/${document.id}`, { state: { document } })
    } catch (error) {
      console.error('Error opening document:', error)
      alert('Error opening document')
    }
  }

  const handleSearch = async (searchFunction, mode) => {
    if (!query.trim()) return

    setIsSearching(true)
    setError('')
    setResults([])

    try {
      const startTime = Date.now()
      const searchOptions = {
        limit: 10,
        documentId: selectedDocument?.id || null
      }
      
      const result = await searchFunction(query, searchOptions)
      const duration = Date.now() - startTime

      if (result.success) {
        setResults(result.results)
        setSearchStats({
          total: result.total,
          method: result.method,
          duration,
          mode
        })
      } else {
        setError(result.error || 'Search failed')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const performSearch = () => {
    switch (searchMode) {
      case 'keyword':
        handleSearch(keywordSearch, 'keyword')
        break
      case 'semantic':
        handleSearch(semanticSearch, 'semantic')
        break
      default:
        handleSearch(hybridSearch, 'hybrid')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/20 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/editor')}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-white">
            <span className="italic text-white">Hybrid</span>
            <span className="text-yellow-300 ml-1">Search</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Document Sidebar */}
        <div className="w-80 bg-white/5 border-r border-white/20 p-4 overflow-y-auto">
          <h2 className="text-lg font-medium text-white mb-4">Search Scope</h2>
          
          {/* Global Search Option */}
          <button
            onClick={() => setSelectedDocument(null)}
            className={`w-full text-left p-3 rounded-lg transition-colors mb-3 ${
              !selectedDocument
                ? 'bg-yellow-500/30 border border-yellow-400/50'
                : 'bg-white/10 border border-white/20 hover:bg-white/20'
            }`}
          >
            <div className={`font-medium ${
              !selectedDocument ? 'text-white' : 'text-yellow-300'
            }`}>
              All Documents
            </div>
            <div className="text-sm text-white/60">
              Search across all documents
            </div>
          </button>

          {/* Document List */}
          {documents.length === 0 ? (
            <div className="text-white/70 text-center py-8">
              <p>No documents found.</p>
              <button
                onClick={() => navigate('/editor')}
                className="text-yellow-300 hover:text-yellow-200 mt-2"
              >
                Upload a document first
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70 mb-2">Or search within:</h3>
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleDocumentSelect(doc)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedDocument?.id === doc.id
                      ? 'bg-yellow-500/30 border border-yellow-400/50'
                      : 'bg-white/10 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  <div className={`font-medium ${
                    selectedDocument?.id === doc.id
                      ? 'text-white'
                      : 'text-yellow-300'
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

        {/* Main Search Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Input Area */}
          <div className="bg-white/5 border-b border-white/20 p-6">
            <div className="max-w-4xl mx-auto">
              {/* Search Mode Selector */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSearchMode('hybrid')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchMode === 'hybrid'
                      ? 'bg-yellow-500/30 border border-yellow-400/50 text-white'
                      : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20'
                  }`}
                >
                  Hybrid
                </button>
                <button
                  onClick={() => setSearchMode('keyword')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchMode === 'keyword'
                      ? 'bg-yellow-500/30 border border-yellow-400/50 text-white'
                      : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20'
                  }`}
                >
                  Keyword
                </button>
                <button
                  onClick={() => setSearchMode('semantic')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchMode === 'semantic'
                      ? 'bg-yellow-500/30 border border-yellow-400/50 text-white'
                      : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20'
                  }`}
                >
                  Semantic
                </button>
              </div>

              {/* Search Input */}
              <div className="flex gap-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  placeholder={`Search ${selectedDocument ? `in "${selectedDocument.title}"` : 'all documents'}...`}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
                <button
                  onClick={performSearch}
                  disabled={isSearching || !query.trim()}
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Stats */}
              {searchStats && (
                <div className="mt-4 text-sm text-white/70">
                  Found {searchStats.total} results in {searchStats.duration}ms using {searchStats.mode} search
                  {searchStats.method && ` (${searchStats.method})`}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-400/50 rounded-lg">
                  <div className="text-sm text-red-300">
                    Error: {error}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              {results.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">
                    Search Results for "{query}"
                  </h3>
                  {results.map((result, index) => (
                    <div
                      key={result.id || index}
                      onClick={() => handleResultClick(result)}
                      className="p-4 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition-colors cursor-pointer group"
                    >
                      <div className="text-white mb-3 group-hover:text-yellow-100 transition-colors">
                        {result.chunk || result.document_title || result.text || 'No content'}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="text-white/60">
                          Score: {((result.hybrid_score || result.score || 0) * 100).toFixed(1)}%
                          {result.fts_score > 0 && result.vector_score > 0 && (
                            <span className="ml-4">
                              FTS: {(result.fts_score * 100).toFixed(0)}% |
                              Vector: {(result.vector_score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="text-yellow-300 group-hover:text-yellow-200 transition-colors">
                          {(result.document_id || result.documentId || 'unknown').substring(0, 8)}...
                          <span className="ml-2 text-xs opacity-70">Click to open</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : query && !isSearching && !error ? (
                <div className="text-center text-white/60 py-12">
                  <div className="text-lg mb-2">No results found</div>
                  <div className="text-sm">Try different keywords or search terms</div>
                </div>
              ) : !query ? (
                <div className="text-center text-white/60 py-12">
                  <div className="text-lg mb-2">Enter a search query to get started</div>
                  <div className="text-sm">
                    Choose between Hybrid (balanced), Keyword (exact matches), or Semantic (meaning-based) search
                  </div>
                </div>
              ) : null}

              {/* Loading State */}
              {isSearching && (
                <div className="text-center text-white/60 py-12">
                  <div className="inline-flex items-center">
                    <div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full mr-3"></div>
                    Searching...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchPage
