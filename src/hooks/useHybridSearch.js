import { useState, useCallback, useRef } from 'react'
import { hybridSearch, formatSearchResults } from '../lib/hybridSearch'

/**
 * Custom hook for hybrid search functionality
 * @param {Object} options - Configuration options
 * @returns {Object} - Search state and functions
 */
export const useHybridSearch = (options = {}) => {
  const {
    debounceMs = 300,
    defaultLimit = 10,
    defaultFtsWeight = 0.5,
    defaultVectorWeight = 0.5
  } = options

  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchError, setSearchError] = useState(null)
  const [searchStats, setSearchStats] = useState({
    total: 0,
    method: null,
    duration: 0
  })

  // Refs for debouncing and cancellation
  const debounceTimeoutRef = useRef(null)
  const searchAbortControllerRef = useRef(null)

  /**
   * Perform search with given parameters
   */
  const performSearch = useCallback(async (query, searchOptions = {}) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([])
      setSearchStats({ total: 0, method: null, duration: 0 })
      return
    }

    // Cancel previous search if still running
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
    }

    // Create new abort controller
    searchAbortControllerRef.current = new AbortController()

    try {
      setIsSearching(true)
      setSearchError(null)
      
      const startTime = Date.now()

      const searchParams = {
        limit: defaultLimit,
        ftsWeight: defaultFtsWeight,
        vectorWeight: defaultVectorWeight,
        ...searchOptions
      }

      console.log('Performing hybrid search:', { query, searchParams })

      const result = await hybridSearch(query, searchParams)

      // Check if search was aborted
      if (searchAbortControllerRef.current?.signal.aborted) {
        return
      }

      const duration = Date.now() - startTime

      if (result.success) {
        const formattedResults = formatSearchResults(result.results)
        setSearchResults(formattedResults)
        setSearchStats({
          total: result.total,
          method: result.method,
          duration
        })
        setSearchQuery(query)
      } else {
        throw new Error(result.error || 'Search failed')
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Search aborted')
        return
      }

      console.error('Search error:', error)
      setSearchError(error.message)
      setSearchResults([])
      setSearchStats({ total: 0, method: null, duration: 0 })
    } finally {
      setIsSearching(false)
      searchAbortControllerRef.current = null
    }
  }, [defaultLimit, defaultFtsWeight, defaultVectorWeight])

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback((query, searchOptions = {}) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query, searchOptions)
    }, debounceMs)
  }, [performSearch, debounceMs])

  /**
   * Immediate search (no debouncing)
   */
  const searchNow = useCallback((query, searchOptions = {}) => {
    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    performSearch(query, searchOptions)
  }, [performSearch])

  /**
   * Search within a specific document
   */
  const searchDocument = useCallback((query, documentId, searchOptions = {}) => {
    return searchNow(query, {
      ...searchOptions,
      documentId,
      limit: searchOptions.limit || 5
    })
  }, [searchNow])

  /**
   * Global search across all documents
   */
  const searchGlobal = useCallback((query, searchOptions = {}) => {
    return searchNow(query, {
      ...searchOptions,
      documentId: null
    })
  }, [searchNow])

  /**
   * Keyword-focused search
   */
  const searchKeywords = useCallback((query, searchOptions = {}) => {
    return searchNow(query, {
      ...searchOptions,
      ftsWeight: 0.8,
      vectorWeight: 0.2
    })
  }, [searchNow])

  /**
   * Semantic-focused search
   */
  const searchSemantic = useCallback((query, searchOptions = {}) => {
    return searchNow(query, {
      ...searchOptions,
      ftsWeight: 0.2,
      vectorWeight: 0.8
    })
  }, [searchNow])

  /**
   * Clear search results
   */
  const clearSearch = useCallback(() => {
    // Cancel ongoing search
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
    }

    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    setSearchResults([])
    setSearchQuery('')
    setSearchError(null)
    setSearchStats({ total: 0, method: null, duration: 0 })
    setIsSearching(false)
  }, [])

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
  }, [])

  return {
    // State
    isSearching,
    searchResults,
    searchQuery,
    searchError,
    searchStats,

    // Functions
    search: debouncedSearch,
    searchNow,
    searchDocument,
    searchGlobal,
    searchKeywords,
    searchSemantic,
    clearSearch,
    cleanup
  }
}
