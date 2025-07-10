import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side operations
)

/**
 * Get embedding for a text using OpenAI API
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The embedding vector
 */
async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      encoding_format: 'float'
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error getting embedding:', error)
    throw new Error(`Failed to get embedding: ${error.message}`)
  }
}

/**
 * Retrieve similar chunks from Supabase using vector similarity
 * @param {string} documentId - The document ID to search within
 * @param {number[]} questionEmbedding - The question embedding vector
 * @param {number} limit - Number of chunks to retrieve
 * @returns {Promise<string[]>} - Array of relevant text chunks
 */
async function retrieveSimilarChunks(documentId, questionEmbedding, limit = 3) {
  try {
    // Use Supabase's vector similarity search
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: questionEmbedding,
      target_document_id: documentId,
      match_threshold: 0.5, // Minimum similarity threshold
      match_count: limit
    })

    if (error) {
      console.error('Supabase RPC error:', error)
      // Fallback to direct SQL query if RPC function doesn't exist
      return await retrieveSimilarChunksFallback(documentId, questionEmbedding, limit)
    }

    return data ? data.map(item => item.chunk) : []
  } catch (error) {
    console.error('Error retrieving similar chunks:', error)
    // Fallback to direct SQL query
    return await retrieveSimilarChunksFallback(documentId, questionEmbedding, limit)
  }
}

/**
 * Fallback method using direct SQL query
 */
async function retrieveSimilarChunksFallback(documentId, questionEmbedding, limit = 3) {
  try {
    const { data, error } = await supabase
      .from('embeddings')
      .select('chunk')
      .eq('document_id', documentId)
      .order('embedding <#> ' + JSON.stringify(questionEmbedding))
      .limit(limit)

    if (error) {
      throw error
    }

    return data ? data.map(item => item.chunk) : []
  } catch (error) {
    console.error('Error in fallback retrieval:', error)
    throw new Error(`Failed to retrieve chunks: ${error.message}`)
  }
}

/**
 * Generate answer using GPT-4 with retrieved context
 * @param {string} question - The user's question
 * @param {string[]} chunks - Retrieved relevant chunks
 * @returns {Promise<string>} - The generated answer
 */
async function generateAnswer(question, chunks) {
  try {
    const context = chunks.join('\n\n')
    
    const prompt = `You are a helpful AI assistant that answers questions based on the provided context. Use only the information from the context to answer the question. If the context doesn't contain enough information to answer the question, say so clearly.

Context:
${context}

Question: ${question}

Answer:`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that answers questions based on provided context. Be concise and accurate.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more focused answers
    })

    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error generating answer:', error)
    throw new Error(`Failed to generate answer: ${error.message}`)
  }
}

/**
 * Main API handler for RAG endpoint
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { question, documentId } = req.body

    // Validate input
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required and must be a string' })
    }

    if (!documentId || typeof documentId !== 'string') {
      return res.status(400).json({ error: 'Document ID is required and must be a string' })
    }

    console.log('Processing RAG request:', { question, documentId })

    // Step 1: Get embedding for the question
    console.log('Getting embedding for question...')
    const questionEmbedding = await getEmbedding(question)

    // Step 2: Retrieve similar chunks from the document
    console.log('Retrieving similar chunks...')
    const relevantChunks = await retrieveSimilarChunks(documentId, questionEmbedding, 3)

    if (relevantChunks.length === 0) {
      return res.status(404).json({ 
        error: 'No relevant content found for this question in the specified document' 
      })
    }

    console.log(`Found ${relevantChunks.length} relevant chunks`)

    // Step 3: Generate answer using GPT-4
    console.log('Generating answer...')
    const answer = await generateAnswer(question, relevantChunks)

    // Return the answer
    return res.status(200).json({
      answer,
      chunksUsed: relevantChunks.length,
      context: relevantChunks // Optional: include context for debugging
    })

  } catch (error) {
    console.error('RAG API error:', error)
    
    // Return appropriate error response
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return res.status(429).json({ 
        error: 'API rate limit exceeded. Please try again later.' 
      })
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
