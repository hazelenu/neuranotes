// Debug script to check embeddings in the database
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugEmbeddings() {
  try {
    console.log('🔍 Debugging embeddings in the database...\n')

    // 1. Check all documents
    console.log('📄 All documents in database:')
    const { data: allDocs, error: docsError } = await supabase
      .from('documents')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError)
      return
    }

    if (!allDocs || allDocs.length === 0) {
      console.log('❌ No documents found')
      return
    }

    allDocs.forEach((doc, index) => {
      console.log(`  ${index + 1}. "${doc.title}" (ID: ${doc.id})`)
      console.log(`     Created: ${new Date(doc.created_at).toLocaleString()}`)
    })

    // 2. Check all embeddings
    console.log('\n🧠 All embeddings in database:')
    const { data: allEmbeddings, error: embError } = await supabase
      .from('embeddings')
      .select('id, document_id, chunk, created_at')
      .order('created_at', { ascending: false })

    if (embError) {
      console.error('❌ Error fetching embeddings:', embError)
      return
    }

    if (!allEmbeddings || allEmbeddings.length === 0) {
      console.log('❌ No embeddings found in database')
      return
    }

    console.log(`📊 Total embeddings: ${allEmbeddings.length}`)

    // Group embeddings by document
    const embeddingsByDoc = {}
    allEmbeddings.forEach(emb => {
      if (!embeddingsByDoc[emb.document_id]) {
        embeddingsByDoc[emb.document_id] = []
      }
      embeddingsByDoc[emb.document_id].push(emb)
    })

    // 3. Show embeddings for each document
    console.log('\n📋 Embeddings by document:')
    for (const doc of allDocs) {
      const docEmbeddings = embeddingsByDoc[doc.id] || []
      console.log(`\n📝 "${doc.title}" (${doc.id}):`)
      
      if (docEmbeddings.length === 0) {
        console.log('   ❌ No embeddings found')
      } else {
        console.log(`   ✅ ${docEmbeddings.length} embeddings found`)
        docEmbeddings.forEach((emb, index) => {
          const preview = emb.chunk.substring(0, 80).replace(/\n/g, ' ')
          console.log(`   ${index + 1}. "${preview}..."`)
        })
      }
    }

    // 4. Look specifically for "Hello" document
    console.log('\n🔍 Looking for "Hello" document specifically:')
    const helloDoc = allDocs.find(doc => 
      doc.title.toLowerCase().includes('hello') || 
      doc.title.toLowerCase().includes('Hello')
    )

    if (helloDoc) {
      console.log(`✅ Found "Hello" document: ${helloDoc.title} (${helloDoc.id})`)
      
      const helloEmbeddings = embeddingsByDoc[helloDoc.id] || []
      console.log(`📊 Embeddings for this document: ${helloEmbeddings.length}`)
      
      if (helloEmbeddings.length > 0) {
        console.log('📝 Embedding chunks:')
        helloEmbeddings.forEach((emb, index) => {
          console.log(`   ${index + 1}. "${emb.chunk}"`)
        })
      }
    } else {
      console.log('❌ No document with "Hello" in title found')
      console.log('📋 Available document titles:')
      allDocs.forEach(doc => {
        console.log(`   - "${doc.title}"`)
      })
    }

    // 5. Test the RPC function
    console.log('\n🧪 Testing RPC function...')
    try {
      const testEmbedding = Array.from({ length: 1536 }, () => Math.random())
      const testDocId = allDocs[0].id

      const { data: rpcResult, error: rpcError } = await supabase.rpc('match_document_chunks', {
        query_embedding: testEmbedding,
        target_document_id: testDocId,
        match_threshold: 0.0, // Very low threshold to get any results
        match_count: 5
      })

      if (rpcError) {
        console.log('❌ RPC function error:', rpcError.message)
        console.log('💡 This might be why the RAG system isn\'t working')
      } else {
        console.log(`✅ RPC function works! Returned ${rpcResult ? rpcResult.length : 0} results`)
      }
    } catch (rpcTestError) {
      console.log('❌ RPC function test failed:', rpcTestError.message)
    }

  } catch (error) {
    console.error('❌ Debug script error:', error)
  }
}

// Run the debug
debugEmbeddings()
