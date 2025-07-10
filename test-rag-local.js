// Local test script for RAG functionality
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Get embedding for a text using OpenAI API
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
 * Retrieve similar chunks from Supabase
 */
async function retrieveSimilarChunks(documentId, questionEmbedding, limit = 3) {
  try {
    // Try using the RPC function first
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: questionEmbedding,
      target_document_id: documentId,
      match_threshold: 0.5,
      match_count: limit
    })

    if (error) {
      console.log('RPC function not available, using fallback...')
      // Fallback to direct query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('embeddings')
        .select('chunk')
        .eq('document_id', documentId)
        .limit(limit)

      if (fallbackError) {
        throw fallbackError
      }

      return fallbackData ? fallbackData.map(item => item.chunk) : []
    }

    return data ? data.map(item => item.chunk) : []
  } catch (error) {
    console.error('Error retrieving chunks:', error)
    throw error
  }
}

/**
 * Generate answer using GPT-4
 */
async function generateAnswer(question, chunks) {
  try {
    const context = chunks.join('\n\n')
    
    const prompt = `You are a helpful AI assistant that answers questions based on the provided context. Use only the information from the context to answer the question.

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
      temperature: 0.3,
    })

    return response.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error generating answer:', error)
    throw error
  }
}

/**
 * Test RAG functionality
 */
async function testRAG() {
  try {
    console.log('🧪 Testing RAG functionality locally...\n')

    // First, let's check if we have any documents with embeddings
    console.log('📊 Checking available documents...')
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title')
      .order('created_at', { ascending: false })

    if (docsError) {
      throw docsError
    }

    if (!documents || documents.length === 0) {
      console.log('❌ No documents found. Please upload a document first.')
      return
    }

    console.log(`📄 Available documents (${documents.length} total):`)
    documents.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.title} (ID: ${doc.id})`)
    })

    // Find a document that has embeddings (prioritize "Hello" document)
    let testDocument = null
    let testDocumentId = null

    // First, try to find the "Hello" document
    const helloDoc = documents.find(doc =>
      doc.title.toLowerCase().includes('hello')
    )

    if (helloDoc) {
      console.log(`\n🔍 Found "Hello" document, checking embeddings...`)
      const { data: helloEmbeddings, error: helloEmbError } = await supabase
        .from('embeddings')
        .select('id, chunk')
        .eq('document_id', helloDoc.id)
        .limit(3)

      if (!helloEmbError && helloEmbeddings && helloEmbeddings.length > 0) {
        testDocument = helloDoc
        testDocumentId = helloDoc.id
        console.log(`✅ Using "Hello" document with ${helloEmbeddings.length} embeddings`)
      }
    }

    // If no "Hello" document with embeddings, check all documents
    if (!testDocument) {
      console.log(`\n🔍 Checking all documents for embeddings...`)

      for (const doc of documents) {
        const { data: embeddings, error: embError } = await supabase
          .from('embeddings')
          .select('id, chunk')
          .eq('document_id', doc.id)
          .limit(1)

        if (!embError && embeddings && embeddings.length > 0) {
          testDocument = doc
          testDocumentId = doc.id
          console.log(`✅ Found document with embeddings: ${doc.title}`)
          break
        }
      }
    }

    if (!testDocument) {
      console.log('❌ No documents with embeddings found. Please upload a document with embeddings.')
      return
    }

    console.log(`\n📝 Testing with document: "${testDocument.title}" (${testDocumentId})`)

    // Test questions relevant to the AI content in the Hello document
    const testQuestions = [
      "What is artificial intelligence?",
      "What are the main challenges of AI development?",
      "How does machine learning work?",
      "What is the future of AI?",
      "What are the applications of AI in healthcare?"
    ]

    for (const question of testQuestions) {
      console.log(`\n❓ Question: "${question}"`)
      console.log('⏳ Processing...')

      try {
        // Get embedding for question
        const questionEmbedding = await getEmbedding(question)
        console.log('✅ Got question embedding')

        // Retrieve similar chunks
        const chunks = await retrieveSimilarChunks(testDocumentId, questionEmbedding, 3)
        console.log(`✅ Retrieved ${chunks.length} relevant chunks`)

        if (chunks.length === 0) {
          console.log('❌ No relevant chunks found')
          continue
        }

        // Generate answer
        const answer = await generateAnswer(question, chunks)
        console.log('✅ Generated answer')
        
        console.log(`\n💬 Answer: ${answer}\n`)
        console.log('📝 Context used:')
        chunks.forEach((chunk, index) => {
          console.log(`  ${index + 1}. ${chunk.substring(0, 100)}...`)
        })
        
      } catch (error) {
        console.error(`❌ Error processing question: ${error.message}`)
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testRAG()
