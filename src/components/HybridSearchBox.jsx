import { useState, useEffect } from 'react'
import { useHybridSearch } from '../hooks/useHybridSearch'
import { highlightSearchTerms } from '../lib/hybridSearch'

const HybridSearchBox = ({ 
  documentId = null, 
  onResultClick = null,
  placeholder = "Search documents...",
  className = "",
  showStats = true,
  showModeToggle = true
}) => {
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState('hybrid') // 'hybrid', 'keyword', 'semantic'
  const [isExpanded, setIsExpanded] = useState(false)

  const {
    isSearching,
    searchResults,
    searchQuery,
    searchError,
    searchStats,
    search,
    searchKeywords,
    searchSemantic,
    searchDocument,
    searchGlobal,
    clearSearch
  } = useHybridSearch({
    debounceMs: 300,
    defaultLimit: documentId ? 5 : 10
  })

  // Handle search based on mode
  const handleSearch = (searchQuery) => {
    if (!searchQuery.trim()) {
      clearSearch()
      return
    }

    const searchOptions = {
      documentId: documentId
    }

    switch (searchMode) {
      case 'keyword':
        searchKeywords(searchQuery, searchOptions)
        break
      case 'semantic':
        searchSemantic(searchQuery, searchOptions)
        break
      default:
        if (documentId) {
          searchDocument(searchQuery, documentId)
        } else {
          searchGlobal(searchQuery)
        }
    }
  }

  // Handle input change
  const handleInputChange = (e) => {
    const newQuery = e.target.value
    setQuery(newQuery)
    handleSearch(newQuery)
    setIsExpanded(newQuery.length > 0)
  }

  // Handle result click
  const handleResultClick = (result) => {
    if (onResultClick) {
      onResultClick(result)
    }
    setIsExpanded(false)
  }

  // Handle clear
  const handleClear = () => {
    setQuery('')
    clearSearch()
    setIsExpanded(false)
  }

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`search-container relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsExpanded(query.length > 0)}
          placeholder={placeholder}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {/* Search/Loading Icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          ) : query ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Search Mode Toggle */}
      {showModeToggle && (
        <div className="flex gap-2 mt-2">
          {['hybrid', 'keyword', 'semantic'].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setSearchMode(mode)
                if (query) handleSearch(query)
              }}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                searchMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Search Results */}
      {isExpanded && (query || searchResults.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Stats */}
          {showStats && searchStats.total > 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 border-b">
              {searchStats.total} results in {searchStats.duration}ms 
              {searchStats.method && ` (${searchStats.method})`}
            </div>
          )}

          {/* Error */}
          {searchError && (
            <div className="px-4 py-3 text-sm text-red-600 border-b">
              Error: {searchError}
            </div>
          )}

          {/* Results */}
          {searchResults.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <div className="text-sm text-gray-900 mb-1">
                    <div 
                      dangerouslySetInnerHTML={{
                        __html: highlightSearchTerms(result.preview, searchQuery)
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Score: {(result.score * 100).toFixed(1)}%</span>
                    {result.ftsScore > 0 && result.vectorScore > 0 && (
                      <span>
                        FTS: {(result.ftsScore * 100).toFixed(0)}% | 
                        Vector: {(result.vectorScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : query && !isSearching && !searchError ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No results found for "{query}"
            </div>
          ) : null}

          {/* Loading */}
          {isSearching && (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              Searching...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default HybridSearchBox
