// Quick test specifically for the Hello document
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testHelloRAG() {
  try {
    console.log('🧪 Testing RAG with Hello document specifically...\n')

    // Use the exact Hello document ID we know has embeddings
    const helloDocId = 'f13162b2-21c8-4e01-9f3e-268e018ba5a5'
    const question = "What is artificial intelligence?"

    console.log(`📝 Document ID: ${helloDocId}`)
    console.log(`❓ Question: "${question}"`)

    // Step 1: Get embedding for question
    console.log('\n⏳ Getting question embedding...')
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: question,
      encoding_format: 'float'
    })
    const questionEmbedding = response.data[0].embedding
    console.log('✅ Got question embedding')

    // Step 2: Search for similar chunks
    console.log('⏳ Searching for similar chunks...')
    const { data: chunks, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: questionEmbedding,
      target_document_id: helloDocId,
      match_threshold: 0.3,
      match_count: 3
    })

    if (error) {
      throw error
    }

    console.log(`✅ Found ${chunks ? chunks.length : 0} relevant chunks`)

    if (!chunks || chunks.length === 0) {
      console.log('❌ No relevant chunks found')
      return
    }

    // Show the chunks
    console.log('\n📝 Retrieved chunks:')
    chunks.forEach((chunk, index) => {
      console.log(`${index + 1}. "${chunk.chunk.substring(0, 100)}..."`)
      console.log(`   Similarity: ${chunk.similarity.toFixed(3)}`)
    })

    // Step 3: Generate answer
    console.log('\n⏳ Generating answer with GPT-4...')
    const context = chunks.map(c => c.chunk).join('\n\n')
    
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Answer the question based only on the provided context.'
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer:`
        }
      ],
      max_tokens: 300,
      temperature: 0.3,
    })

    const answer = chatResponse.choices[0].message.content.trim()
    console.log('✅ Generated answer')

    console.log('\n🎉 RAG Test Results:')
    console.log('=' .repeat(50))
    console.log(`Question: ${question}`)
    console.log(`Answer: ${answer}`)
    console.log('=' .repeat(50))

    console.log('\n✅ RAG system is working perfectly!')

  } catch (error) {
    console.error('❌ RAG test failed:', error.message)
    
    if (error.message.includes('quota')) {
      console.log('💡 This is an OpenAI quota issue, not a RAG system problem')
    }
  }
}

testHelloRAG()
