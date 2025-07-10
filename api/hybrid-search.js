import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Generate embedding for the query text
 */
async function generateQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query.trim(),
      encoding_format: 'float',
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error('Failed to generate query embedding')
  }
}

/**
 * Perform Full Text Search
 */
async function performFTSSearch(queryText, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('embeddings')
      .select('id, document_id, chunk')
      .textSearch('chunk', queryText, {
        type: 'plainto',
        config: 'english'
      })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('FTS search error:', error)
    return []
  }
}

/**
 * Perform Vector Similarity Search
 */
async function performVectorSearch(queryEmbedding, limit = 20) {
  try {
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: limit
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Vector search error:', error)
    return []
  }
}

/**
 * Calculate hybrid score and merge results
 */
function mergeAndScore(ftsResults, vectorResults, ftsWeight = 0.5, vectorWeight = 0.5) {
  const resultMap = new Map()

  // Add FTS results
  ftsResults.forEach((result, index) => {
    const ftsScore = Math.max(0, 1 - (index / ftsResults.length)) // Simple ranking score
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
 * Main hybrid search handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      query, 
      documentId = null, 
      limit = 10,
      ftsWeight = 0.5,
      vectorWeight = 0.5,
      useSupabaseFunction = false 
    } = req.body

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required and must be a non-empty string' })
    }

    if (query.length > 1000) {
      return res.status(400).json({ error: 'Query must be less than 1000 characters' })
    }

    console.log('Processing hybrid search:', { 
      query: query.substring(0, 100) + '...', 
      documentId, 
      limit,
      useSupabaseFunction 
    })

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query)

    let results

    if (useSupabaseFunction) {
      // Use Supabase SQL function approach
      const functionName = documentId ? 'hybrid_search_document' : 'simple_hybrid_search'
      const params = documentId 
        ? {
            query_embedding: queryEmbedding,
            query_text: query,
            target_document_id: documentId,
            match_count: limit
          }
        : {
            query_embedding: queryEmbedding,
            query_text: query,
            match_count: limit
          }

      const { data, error } = await supabase.rpc(functionName, params)
      
      if (error) throw error
      results = data || []
    } else {
      // Use JavaScript merging approach
      const [ftsResults, vectorResults] = await Promise.all([
        performFTSSearch(query, limit * 2),
        performVectorSearch(queryEmbedding, limit * 2)
      ])

      // Filter by document if specified
      const filteredFTS = documentId 
        ? ftsResults.filter(r => r.document_id === documentId)
        : ftsResults

      const filteredVector = documentId
        ? vectorResults.filter(r => r.document_id === documentId)
        : vectorResults

      // Merge and score results
      const mergedResults = mergeAndScore(filteredFTS, filteredVector, ftsWeight, vectorWeight)
      results = mergedResults.slice(0, limit)
    }

    // Return results
    res.status(200).json({
      success: true,
      query,
      results,
      total: results.length,
      method: useSupabaseFunction ? 'sql_function' : 'javascript_merge'
    })

  } catch (error) {
    console.error('Hybrid search error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
