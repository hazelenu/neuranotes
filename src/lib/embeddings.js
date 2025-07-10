import OpenAI from 'openai'
import { supabase } from './supabase'

// Initialize OpenAI client with error handling
let openai = null
try {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (apiKey) {
    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Note: In production, this should be done server-side
    })
  } else {
    console.warn('OpenAI API key not found. Some features will be disabled.')
  }
} catch (error) {
  console.warn('Failed to initialize OpenAI client:', error.message)
}

/**
 * Split text into chunks of approximately 200 tokens each
 * @param {string} text - The text to split
 * @returns {string[]} - Array of text chunks
 */
const splitIntoChunks = (text) => {
  // Rough estimation: 1 token ≈ 4 characters for English text
  const targetChunkSize = 800 // ~200 tokens * 4 chars/token
  const chunks = []
  
  // First, split by paragraphs (double newlines)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed our target size
    if (currentChunk.length + paragraph.length > targetChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }
  
  // Add the last chunk if it exists
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  // If we still have chunks that are too large, split by sentences
  const finalChunks = []
  for (const chunk of chunks) {
    if (chunk.length <= targetChunkSize) {
      finalChunks.push(chunk)
    } else {
      // Split large chunks by sentences
      const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 0)
      let sentenceChunk = ''
      
      for (const sentence of sentences) {
        const sentenceWithPunctuation = sentence.trim() + '.'
        
        if (sentenceChunk.length + sentenceWithPunctuation.length > targetChunkSize && sentenceChunk.length > 0) {
          finalChunks.push(sentenceChunk.trim())
          sentenceChunk = sentenceWithPunctuation
        } else {
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentenceWithPunctuation
        }
      }
      
      if (sentenceChunk.trim().length > 0) {
        finalChunks.push(sentenceChunk.trim())
      }
    }
  }
  
  return finalChunks.filter(chunk => chunk.length > 0)
}

/**
 * Get embedding for a text chunk using OpenAI API
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The embedding vector
 */
const getEmbedding = async (text) => {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Please check your API key configuration.')
  }

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
 * Embed a document by splitting it into chunks and storing embeddings in Supabase
 * @param {string} text - The document text to embed
 * @param {string} documentId - The UUID of the document
 * @returns {Promise<void>}
 */
export const embedDocument = async (text, documentId) => {
  try {
    console.log('🚨 MOCK MODE: OpenAI API quota exceeded, using mock embeddings...')
    console.log('Document ID:', documentId)
    console.log('Text length:', text.length)

    // Step 1: Split document into chunks
    const chunks = splitIntoChunks(text)
    console.log(`Split document into ${chunks.length} chunks`)

    if (chunks.length === 0) {
      throw new Error('No chunks created from document text')
    }

    // Step 2: Create mock embeddings for each chunk
    const embeddingData = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`)

      try {
        // Create mock embedding (1536 random numbers between -1 and 1)
        const mockEmbedding = Array.from({ length: 1536 }, () => (Math.random() - 0.5) * 2)

        // Prepare data for Supabase
        embeddingData.push({
          document_id: documentId,
          chunk: chunk,
          embedding: mockEmbedding
        })

        // Add a small delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 50))

      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error)
        // Continue with other chunks instead of failing completely
      }
    }

    if (embeddingData.length === 0) {
      throw new Error('No embeddings were successfully created')
    }

    console.log(`Successfully created ${embeddingData.length} mock embeddings`)

    // Step 3: Insert embeddings into Supabase in batches
    const batchSize = 10 // Insert in smaller batches to avoid timeouts

    for (let i = 0; i < embeddingData.length; i += batchSize) {
      const batch = embeddingData.slice(i, i + batchSize)
      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(embeddingData.length / batchSize)}`)

      const { error } = await supabase
        .from('embeddings')
        .insert(batch)

      if (error) {
        console.error('Supabase insert error:', error)
        throw new Error(`Failed to insert embeddings: ${error.message}`)
      }
    }

    console.log('✅ Document embedding completed successfully (MOCK MODE)!')
    console.log(`Total chunks processed: ${embeddingData.length}`)

  } catch (error) {
    console.error('Error in embedDocument:', error)
    throw error
  }
}

/**
 * Search for similar chunks using vector similarity
 * @param {string} query - The search query
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} - Array of similar chunks with similarity scores
 */
export const searchSimilarChunks = async (query, limit = 5) => {
  try {
    // Get embedding for the query
    const queryEmbedding = await getEmbedding(query)
    
    // Search for similar chunks using Supabase vector similarity
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit
    })
    
    if (error) {
      throw new Error(`Search failed: ${error.message}`)
    }
    
    return data || []
    
  } catch (error) {
    console.error('Error searching similar chunks:', error)
    throw error
  }
}

