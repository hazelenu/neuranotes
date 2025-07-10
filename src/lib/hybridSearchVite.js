/**
 * Vite-Compatible Hybrid Search Library for NeuraNotes
 * Combines Full Text Search with Vector Similarity using direct Supabase calls
 */

import { supabase } from './supabase'

// Get OpenAI API key from environment
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

/**
 * Generate embedding for the query text using OpenAI
 */
async function generateQueryEmbedding(query) {
  console.log('🔑 OpenAI API Key available:', !!OPENAI_API_KEY)
  console.log('🔑 API Key prefix:', OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 20) + '...' : 'Not found')

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY in your .env file.')
  }

  try {
    console.log('🚀 Generating embedding for query:', query)
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: query.trim(),
        encoding_format: 'float',
      })
    })

    console.log('📡 OpenAI API Response status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ OpenAI API Error:', error)
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Successfully generated embedding')
    return data.data[0].embedding
  } catch (error) {
    console.error('❌ Error generating embedding:', error)
    throw new Error(`Failed to generate query embedding: ${error.message}`)
  }
}

/**
 * Perform Full Text Search using Supabase
 */
async function performFTSSearch(queryText, documentId = null, limit = 20) {
  try {
    let query = supabase
      .from('embeddings')
      .select('id, document_id, content as chunk')
      .textSearch('content', queryText, {
        type: 'plainto',
        config: 'english'
      })

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data, error } = await query.limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('FTS search error:', error)
    return []
  }
}

/**
 * Fallback search that searches document content directly
 */
async function performDocumentSearch(queryText, documentId = null, limit = 20) {
  try {
    console.log('🔍 Performing document content search for:', queryText)

    let query = supabase
      .from('documents')
      .select('id, title, content, created_at, updated_at')
      .limit(limit)

    if (documentId) {
      query = query.eq('id', documentId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // Filter documents that contain the search term
    const filteredResults = (data || []).filter(doc => {
      const searchLower = queryText.toLowerCase()

      // Search in title
      if (doc.title.toLowerCase().includes(searchLower)) {
        return true
      }

      // Search in content
      if (doc.content) {
        let textContent = ''

        // Extract text from different content types
        if (typeof doc.content === 'string') {
          textContent = doc.content
        } else if (doc.content.type === 'uploaded_file' && doc.content.original_content) {
          textContent = doc.content.original_content
        } else if (doc.content.content) {
          // Extract from Tiptap JSON
          const extractText = (node) => {
            if (node.type === 'text') {
              textContent += node.text + ' '
            } else if (node.content) {
              node.content.forEach(extractText)
            }
          }
          doc.content.content.forEach(extractText)
        }

        return textContent.toLowerCase().includes(searchLower)
      }

      return false
    })

    // Convert to embeddings-like format for consistency
    const results = filteredResults.map(doc => ({
      id: doc.id,
      document_id: doc.id,
      chunk: doc.title, // Use title as the chunk for display
      content: doc.content,
      document_title: doc.title,
      created_at: doc.created_at
    }))

    console.log(`📄 Found ${results.length} documents matching "${queryText}"`)
    return results

  } catch (error) {
    console.error('Document search error:', error)
    return []
  }
}

/**
 * Perform Vector Similarity Search using Supabase RPC
 */
async function performVectorSearch(queryEmbedding, documentId = null, limit = 20) {
  try {
    const functionName = documentId ? 'match_document_chunks' : 'match_chunks'
    const params = documentId 
      ? {
          query_embedding: queryEmbedding,
          target_document_id: documentId,
          match_threshold: 0.5,
          match_count: limit
        }
      : {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: limit
        }

    const { data, error } = await supabase.rpc(functionName, params)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Vector search error:', error)
    return []
  }
}

/**
 * Use Supabase hybrid search function if available
 */
async function performSupabaseHybridSearch(queryEmbedding, queryText, options = {}) {
  const {
    documentId = null,
    limit = 10,
    ftsWeight = 0.5,
    vectorWeight = 0.5
  } = options

  try {
    const functionName = documentId ? 'hybrid_search_document' : 'simple_hybrid_search'
    
    let params
    if (documentId) {
      params = {
        query_embedding: queryEmbedding,
        query_text: queryText,
        target_document_id: documentId,
        match_count: limit
      }
    } else {
      params = {
        query_embedding: queryEmbedding,
        query_text: queryText,
        match_count: limit
      }
    }

    const { data, error } = await supabase.rpc(functionName, params)

    if (error) throw error
    
    // Format results to match expected structure
    return (data || []).map(result => ({
      id: result.id,
      document_id: result.document_id,
      chunk: result.chunk,
      hybrid_score: result.hybrid_score,
      fts_score: result.fts_score || 0,
      vector_score: result.vector_score || result.hybrid_score || 0
    }))
  } catch (error) {
    console.error('Supabase hybrid search error:', error)
    throw error
  }
}

/**
 * Merge FTS and Vector results with hybrid scoring
 */
function mergeAndScore(ftsResults, vectorResults, ftsWeight = 0.5, vectorWeight = 0.5) {
  const resultMap = new Map()

  // Add FTS results with ranking-based scores
  ftsResults.forEach((result, index) => {
    const ftsScore = Math.max(0, 1 - (index / ftsResults.length))
    resultMap.set(result.id, {
      ...result,
      fts_score: ftsScore,
      vector_score: 0,
      hybrid_score: ftsWeight * ftsScore
    })
  })

  // Add/merge vector results
  vectorResults.forEach((result) => {
    const vectorScore = result.similarity || 0
    
    if (resultMap.has(result.id)) {
      // Merge with existing FTS result
      const existing = resultMap.get(result.id)
      existing.vector_score = vectorScore
      existing.hybrid_score = ftsWeight * existing.fts_score + vectorWeight * vectorScore
    } else {
      // Add new vector-only result
      resultMap.set(result.id, {
        id: result.id,
        document_id: result.document_id,
        chunk: result.chunk,
        fts_score: 0,
        vector_score: vectorScore,
        hybrid_score: vectorWeight * vectorScore
      })
    }
  })

  // Convert to array and sort by hybrid score
  return Array.from(resultMap.values())
    .sort((a, b) => b.hybrid_score - a.hybrid_score)
}

/**
 * Main hybrid search function
 */
export const hybridSearch = async (query, options = {}) => {
  try {
    const {
      documentId = null,
      limit = 10,
      ftsWeight = 0.5,
      vectorWeight = 0.5,
      useSupabaseFunction = true,
      fallbackToFTSOnly = true
    } = options

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return {
        success: true,
        query: '',
        results: [],
        total: 0,
        method: 'empty_query'
      }
    }

    console.log('Performing hybrid search:', { query, options })

    let queryEmbedding = null

    // Try to generate query embedding, fallback to FTS-only if it fails
    try {
      queryEmbedding = await generateQueryEmbedding(query)
    } catch (embeddingError) {
      console.warn('⚠️ Embedding generation failed, falling back to FTS-only search:', embeddingError.message)

      if (!fallbackToFTSOnly) {
        throw embeddingError
      }

      // Try FTS search first, then fallback to document search
      let ftsResults = await performFTSSearch(query, documentId, limit)

      if (ftsResults.length === 0) {
        console.log('📄 FTS found no results, trying document content search...')
        ftsResults = await performDocumentSearch(query, documentId, limit)
      }

      const formattedResults = ftsResults.map((result, index) => ({
        ...result,
        fts_score: Math.max(0, 1 - (index / ftsResults.length)),
        vector_score: 0,
        hybrid_score: Math.max(0, 1 - (index / ftsResults.length))
      }))

      return {
        success: true,
        query,
        results: formattedResults,
        total: formattedResults.length,
        method: ftsResults.length > 0 ? 'document_search_fallback' : 'no_results_found'
      }
    }

    let results

    if (useSupabaseFunction) {
      // Try using Supabase hybrid search function
      try {
        results = await performSupabaseHybridSearch(queryEmbedding, query, options)
        results = results.slice(0, limit)
      } catch (error) {
        console.warn('Supabase function failed, falling back to JavaScript merge:', error.message)
        useSupabaseFunction = false
      }
    }

    if (!useSupabaseFunction) {
      // Fallback to JavaScript merging
      let ftsResults = await performFTSSearch(query, documentId, limit * 2)

      // If no FTS results, try document search
      if (ftsResults.length === 0) {
        console.log('📄 No embeddings found, using document search...')
        ftsResults = await performDocumentSearch(query, documentId, limit * 2)
      }

      const vectorResults = await performVectorSearch(queryEmbedding, documentId, limit * 2)

      const mergedResults = mergeAndScore(ftsResults, vectorResults, ftsWeight, vectorWeight)
      results = mergedResults.slice(0, limit)
    }

    return {
      success: true,
      query,
      results,
      total: results.length,
      method: useSupabaseFunction ? 'supabase_function' : 'javascript_merge'
    }

  } catch (error) {
    console.error('Hybrid search error:', error)
    return {
      success: false,
      error: error.message,
      query,
      results: [],
      total: 0
    }
  }
}

/**
 * Search within a specific document
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
 */
export const globalSearch = async (query, options = {}) => {
  return hybridSearch(query, {
    ...options,
    documentId: null,
    limit: options.limit || 10
  })
}

/**
 * Keyword-focused search (higher FTS weight)
 */
export const keywordSearch = async (query, options = {}) => {
  return hybridSearch(query, {
    ...options,
    ftsWeight: 0.8,
    vectorWeight: 0.2
  })
}

/**
 * Semantic-focused search (higher vector weight)
 */
export const semanticSearch = async (query, options = {}) => {
  return hybridSearch(query, {
    ...options,
    ftsWeight: 0.2,
    vectorWeight: 0.8
  })
}

/**
 * Format search results for display
 */
export const formatSearchResults = (results) => {
  return results.map(result => ({
    id: result.id,
    documentId: result.document_id,
    text: result.chunk,
    score: result.hybrid_score || result.similarity || 0,
    ftsScore: result.fts_score || 0,
    vectorScore: result.vector_score || result.similarity || 0,
    preview: result.chunk && result.chunk.length > 200 
      ? result.chunk.substring(0, 200) + '...'
      : result.chunk || ''
  }))
}

/**
 * Highlight search terms in text
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
