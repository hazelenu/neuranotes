/**
 * Hybrid Search Library for NeuraNotes
 * Combines Full Text Search with Vector Similarity
 */

/**
 * Perform hybrid search using the API endpoint
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results
 */
export const hybridSearch = async (query, options = {}) => {
  try {
    const {
      documentId = null,
      limit = 10,
      ftsWeight = 0.5,
      vectorWeight = 0.5,
      useSupabaseFunction = true
    } = options

    console.log('Performing hybrid search:', { query, options })

    const response = await fetch('/api/hybrid-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        documentId,
        limit,
        ftsWeight,
        vectorWeight,
        useSupabaseFunction
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Search failed')
    }

    return {
      success: true,
      query: data.query,
      results: data.results,
      total: data.total,
      method: data.method
    }

  } catch (error) {
    console.error('Hybrid search error:', error)
    return {
      success: false,
      error: error.message,
      results: [],
      total: 0
    }
  }
}

/**
 * Search within a specific document
 * @param {string} query - The search query
 * @param {string} documentId - The document UUID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Search results
 */
export const searchDocument = async (query, documentId, options = {}) => {
  return hybridSearch(query, {
    ...options,
    documentId,
    limit: options.limit || 5
  })
}

/**
 * Global search across all documents
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results
 */
export const globalSearch = async (query, options = {}) => {
  return hybridSearch(query, {
    ...options,
    documentId: null,
    limit: options.limit || 10
  })
}

/**
 * Search with custom weights for FTS vs Vector similarity
 * @param {string} query - The search query
 * @param {number} ftsWeight - Weight for Full Text Search (0-1)
 * @param {number} vectorWeight - Weight for Vector similarity (0-1)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Search results
 */
export const weightedSearch = async (query, ftsWeight, vectorWeight, options = {}) => {
  // Normalize weights to sum to 1
  const totalWeight = ftsWeight + vectorWeight
  const normalizedFTS = totalWeight > 0 ? ftsWeight / totalWeight : 0.5
  const normalizedVector = totalWeight > 0 ? vectorWeight / totalWeight : 0.5

  return hybridSearch(query, {
    ...options,
    ftsWeight: normalizedFTS,
    vectorWeight: normalizedVector
  })
}

/**
 * Keyword-focused search (higher FTS weight)
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results
 */
export const keywordSearch = async (query, options = {}) => {
  return weightedSearch(query, 0.8, 0.2, options)
}

/**
 * Semantic-focused search (higher vector weight)
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results
 */
export const semanticSearch = async (query, options = {}) => {
  return weightedSearch(query, 0.2, 0.8, options)
}

/**
 * Format search results for display
 * @param {Array} results - Raw search results
 * @returns {Array} - Formatted results
 */
export const formatSearchResults = (results) => {
  return results.map(result => ({
    id: result.id,
    documentId: result.document_id,
    text: result.chunk,
    score: result.hybrid_score || result.similarity || 0,
    ftsScore: result.fts_score || 0,
    vectorScore: result.vector_score || result.similarity || 0,
    preview: result.chunk.length > 200 
      ? result.chunk.substring(0, 200) + '...'
      : result.chunk
  }))
}

/**
 * Highlight search terms in text
 * @param {string} text - The text to highlight
 * @param {string} query - The search query
 * @returns {string} - Text with highlighted terms
 */
export const highlightSearchTerms = (text, query) => {
  if (!query || !text) return text

  const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
  let highlightedText = text

  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi')
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>')
  })

  return highlightedText
}

/**
 * Get search suggestions based on existing chunks
 * @param {string} partialQuery - Partial search query
 * @param {number} limit - Number of suggestions
 * @returns {Promise<Array>} - Search suggestions
 */
export const getSearchSuggestions = async (partialQuery, limit = 5) => {
  try {
    if (!partialQuery || partialQuery.length < 2) {
      return []
    }

    // This would need a separate endpoint or function
    // For now, return empty array
    return []
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    return []
  }
}
