// Test direct Supabase hybrid search (without API endpoints)
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSupabaseFunctions() {
  console.log('🧪 Testing Supabase Hybrid Search Functions\n')

  // Test if functions exist
  console.log('1. Testing if hybrid search functions exist...')
  
  try {
    // Test simple hybrid search with mock data
    const mockEmbedding = Array(1536).fill(0.1)
    
    const { data, error } = await supabase.rpc('simple_hybrid_search', {
      query_embedding: mockEmbedding,
      query_text: 'test',
      match_count: 3
    })

    if (error) {
      console.log('❌ Function error:', error.message)
      console.log('   Make sure you ran the supabase-hybrid-search.sql script')
    } else {
      console.log('✅ simple_hybrid_search function works!')
      console.log(`   Returned ${data?.length || 0} results`)
    }

  } catch (error) {
    console.log('❌ Connection error:', error.message)
  }
}

async function testEmbeddingsData() {
  console.log('\n2. Checking embeddings data...')
  
  try {
    const { data, error } = await supabase
      .from('embeddings')
      .select('id, document_id, chunk')
      .limit(3)

    if (error) {
      console.log('❌ Error accessing embeddings:', error.message)
    } else if (!data || data.length === 0) {
      console.log('⚠️  No embeddings found in database')
      console.log('   You need to upload documents and create embeddings first')
    } else {
      console.log(`✅ Found ${data.length} embeddings (showing first 3)`)
      data.forEach((item, i) => {
        console.log(`   ${i+1}. ${item.chunk.substring(0, 50)}...`)
      })
    }

  } catch (error) {
    console.log('❌ Database error:', error.message)
  }
}

async function testFTSSearch() {
  console.log('\n3. Testing Full Text Search...')
  
  try {
    const { data, error } = await supabase
      .from('embeddings')
      .select('id, document_id, chunk')
      .textSearch('chunk', 'test', {
        type: 'plainto',
        config: 'english'
      })
      .limit(3)

    if (error) {
      console.log('❌ FTS error:', error.message)
    } else {
      console.log(`✅ FTS returned ${data?.length || 0} results`)
      if (data && data.length > 0) {
        console.log(`   First result: ${data[0].chunk.substring(0, 50)}...`)
      }
    }

  } catch (error) {
    console.log('❌ FTS test error:', error.message)
  }
}

async function testVectorSearch() {
  console.log('\n4. Testing Vector Search...')
  
  try {
    const mockEmbedding = Array(1536).fill(0.1)
    
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: mockEmbedding,
      match_threshold: 0.5,
      match_count: 3
    })

    if (error) {
      console.log('❌ Vector search error:', error.message)
      console.log('   Make sure you ran the supabase-embeddings-only.sql script')
    } else {
      console.log(`✅ Vector search returned ${data?.length || 0} results`)
      if (data && data.length > 0) {
        console.log(`   First result: ${data[0].chunk.substring(0, 50)}...`)
      }
    }

  } catch (error) {
    console.log('❌ Vector search test error:', error.message)
  }
}

async function testEnvironmentSetup() {
  console.log('🔍 Environment Setup Check\n')
  
  const requiredVars = [
    { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
    { name: 'REACT_APP_SUPABASE_URL', value: process.env.REACT_APP_SUPABASE_URL },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { name: 'VITE_OPENAI_API_KEY', value: process.env.VITE_OPENAI_API_KEY },
    { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY }
  ]
  
  requiredVars.forEach(({ name, value }) => {
    if (value) {
      console.log(`✅ ${name}: ${value.substring(0, 20)}...`)
    } else {
      console.log(`❌ ${name}: Not set`)
    }
  })
  
  // Check which Supabase URL to use
  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL
  console.log(`\n🔗 Using Supabase URL: ${supabaseUrl}`)
}

async function main() {
  console.log('🚀 Direct Supabase Hybrid Search Test\n')
  
  await testEnvironmentSetup()
  await testEmbeddingsData()
  await testFTSSearch()
  await testVectorSearch()
  await testSupabaseFunctions()
  
  console.log('\n✅ All tests completed!')
  console.log('\n💡 Next steps:')
  console.log('   1. If functions are missing, run supabase-hybrid-search.sql')
  console.log('   2. If no embeddings, upload documents and create embeddings')
  console.log('   3. Test in browser at http://localhost:5173/search-test')
}

main().catch(console.error)
