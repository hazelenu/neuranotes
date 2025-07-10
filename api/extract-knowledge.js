import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Extract knowledge triplets from text using GPT-4
 * @param {string} text - The text to extract knowledge from
 * @returns {Promise<Array>} - Array of triplets {subject, predicate, object, source_snippet}
 */
async function extractKnowledgeTriplets(text) {
  try {
    const prompt = `Extract knowledge triplets from the following text. A triplet consists of (subject, predicate, object).

Rules:
1. Extract factual relationships only
2. Use clear, concise subjects and objects
3. Use descriptive predicates (verbs or relationships)
4. Return ONLY a JSON array of objects with "subject", "predicate", "object", "source_snippet" fields
5. Maximum 20 triplets per text
6. Include the original sentence/paragraph where each triplet was found in "source_snippet"

Example format:
[
  {"subject": "Alan Turing", "predicate": "invented", "object": "Turing Machine", "source_snippet": "Alan Turing invented the Turing Machine in 1936 as a theoretical model of computation."},
  {"subject": "GPT-4", "predicate": "is developed by", "object": "OpenAI", "source_snippet": "GPT-4 is developed by OpenAI and represents a significant advancement in language models."},
  {"subject": "Machine Learning", "predicate": "is a subset of", "object": "Artificial Intelligence", "source_snippet": "Machine Learning is a subset of Artificial Intelligence that focuses on algorithms."}
]

Text to analyze:
${text}

JSON triplets:`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert knowledge extraction system. Extract factual relationships as JSON triplets. Return only valid JSON array, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.1, // Low temperature for consistent extraction
    })

    const content = response.choices[0].message.content.trim()
    
    // Parse JSON response
    try {
      const triplets = JSON.parse(content)
      
      // Validate triplets format
      if (!Array.isArray(triplets)) {
        throw new Error('Response is not an array')
      }
      
      const validTriplets = triplets.filter(triplet =>
        triplet.subject && triplet.predicate && triplet.object &&
        typeof triplet.subject === 'string' &&
        typeof triplet.predicate === 'string' &&
        typeof triplet.object === 'string' &&
        typeof triplet.source_snippet === 'string'
      )
      
      return validTriplets
      
    } catch (parseError) {
      console.error('Failed to parse GPT-4 response as JSON:', content)
      throw new Error('Invalid JSON response from GPT-4')
    }
    
  } catch (error) {
    console.error('Error extracting knowledge triplets:', error)
    throw new Error(`Failed to extract knowledge: ${error.message}`)
  }
}

/**
 * Save knowledge triplets to Supabase
 * @param {Array} triplets - Array of triplet objects
 * @param {string} documentId - The document ID
 * @returns {Promise<Array>} - Inserted triplets with IDs
 */
async function saveKnowledgeTriplets(triplets, documentId) {
  try {
    // Prepare data for insertion
    const tripletsToInsert = triplets.map(triplet => ({
      subject: triplet.subject.trim(),
      predicate: triplet.predicate.trim(),
      object: triplet.object.trim(),
      source_snippet: triplet.source_snippet ? triplet.source_snippet.trim() : null,
      document_id: documentId,
      created_at: new Date().toISOString()
    }))

    // Insert into Supabase
    const { data, error } = await supabase
      .from('knowledge_graph')
      .insert(tripletsToInsert)
      .select()

    if (error) {
      throw error
    }

    return data || []
    
  } catch (error) {
    console.error('Error saving knowledge triplets:', error)
    throw new Error(`Failed to save knowledge: ${error.message}`)
  }
}

/**
 * Main API handler for knowledge extraction
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
    const { text, document_id } = req.body

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' })
    }

    if (!document_id || typeof document_id !== 'string') {
      return res.status(400).json({ error: 'Document ID is required and must be a string' })
    }

    if (text.length < 50) {
      return res.status(400).json({ error: 'Text must be at least 50 characters long' })
    }

    if (text.length > 10000) {
      return res.status(400).json({ error: 'Text must be less than 10,000 characters' })
    }

    console.log('Processing knowledge extraction request:', { 
      textLength: text.length, 
      documentId: document_id 
    })

    // Step 1: Extract knowledge triplets using GPT-4
    console.log('Extracting knowledge triplets...')
    const triplets = await extractKnowledgeTriplets(text)

    if (triplets.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No knowledge triplets found in the text',
        triplets: [],
        count: 0
      })
    }

    console.log(`Extracted ${triplets.length} triplets`)

    // Step 2: Save triplets to database
    console.log('Saving triplets to database...')
    const savedTriplets = await saveKnowledgeTriplets(triplets, document_id)

    console.log(`Saved ${savedTriplets.length} triplets to database`)

    // Return success response
    return res.status(200).json({
      success: true,
      message: `Successfully extracted and saved ${savedTriplets.length} knowledge triplets`,
      triplets: savedTriplets,
      count: savedTriplets.length
    })

  } catch (error) {
    console.error('Knowledge extraction API error:', error)
    
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
