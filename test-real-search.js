// Test with real search queries
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Generate a simple mock embedding (in real app, this would come from OpenAI)
function generateMockEmbedding(text) {
  // Create a simple hash-based mock embedding
  const embedding = new Array(1536).fill(0)
  for (let i = 0; i < text.length && i < 100; i++) {
    const charCode = text.charCodeAt(i)
    embedding[i % 1536] = (charCode / 255) * 0.1
  }
  return embedding
}

async function testRealQueries() {
  console.log('🔍 Testing with Real Search Queries\n')
  
  const queries = [
    'artificial intelligence',
    'deep learning',
    'healthcare',
    'AI systems',
    'machine learning'
  ]
  
  for (const query of queries) {
    console.log(`\n🔍 Testing query: "${query}"`)
    
    // Test FTS
    try {
      const { data: ftsData, error: ftsError } = await supabase
        .from('embeddings')
        .select('id, document_id, chunk')
        .textSearch('chunk', query, {
          type: 'plainto',
          config: 'english'
        })
        .limit(3)
      
      if (ftsError) {
        console.log(`   ❌ FTS Error: ${ftsError.message}`)
      } else {
        console.log(`   📝 FTS: ${ftsData?.length || 0} results`)
        if (ftsData && ftsData.length > 0) {
          console.log(`      "${ftsData[0].chunk.substring(0, 80)}..."`)
        }
      }
    } catch (error) {
      console.log(`   ❌ FTS Exception: ${error.message}`)
    }
    
    // Test Vector Search with mock embedding
    try {
      const mockEmbedding = generateMockEmbedding(query)
      
      const { data: vectorData, error: vectorError } = await supabase.rpc('match_chunks', {
        query_embedding: mockEmbedding,
        match_threshold: 0.1, // Lower threshold for mock embeddings
        match_count: 3
      })
      
      if (vectorError) {
        console.log(`   ❌ Vector Error: ${vectorError.message}`)
      } else {
        console.log(`   🎯 Vector: ${vectorData?.length || 0} results`)
        if (vectorData && vectorData.length > 0) {
          console.log(`      "${vectorData[0].chunk.substring(0, 80)}..."`)
        }
      }
    } catch (error) {
      console.log(`   ❌ Vector Exception: ${error.message}`)
    }
    
    // Test Hybrid Search
    try {
      const mockEmbedding = generateMockEmbedding(query)
      
      const { data: hybridData, error: hybridError } = await supabase.rpc('simple_hybrid_search', {
        query_embedding: mockEmbedding,
        query_text: query,
        match_count: 3
      })
      
      if (hybridError) {
        console.log(`   ❌ Hybrid Error: ${hybridError.message}`)
      } else {
        console.log(`   🔄 Hybrid: ${hybridData?.length || 0} results`)
        if (hybridData && hybridData.length > 0) {
          const score = (hybridData[0].hybrid_score * 100).toFixed(1)
          console.log(`      Score: ${score}% - "${hybridData[0].chunk.substring(0, 80)}..."`)
        }
      }
    } catch (error) {
      console.log(`   ❌ Hybrid Exception: ${error.message}`)
    }
  }
}

async function testWithRealEmbeddings() {
  console.log('\n\n🎯 Testing with Real OpenAI Embeddings\n')
  
  const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  
  if (!OPENAI_API_KEY) {
    console.log('⚠️  No OpenAI API key found, skipping real embedding test')
    return
  }
  
  const query = 'artificial intelligence'
  console.log(`🔍 Testing "${query}" with real OpenAI embedding...`)
  
  try {
    // Generate real embedding
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: query,
        encoding_format: 'float',
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    const embedding = data.data[0].embedding
    
    console.log('✅ Generated real embedding from OpenAI')
    
    // Test with real embedding
    const { data: hybridData, error: hybridError } = await supabase.rpc('simple_hybrid_search', {
      query_embedding: embedding,
      query_text: query,
      match_count: 5
    })
    
    if (hybridError) {
      console.log(`❌ Hybrid search error: ${hybridError.message}`)
    } else {
      console.log(`🎉 Real hybrid search: ${hybridData?.length || 0} results`)
      
      if (hybridData && hybridData.length > 0) {
        hybridData.forEach((result, i) => {
          const score = (result.hybrid_score * 100).toFixed(1)
          console.log(`   ${i+1}. Score: ${score}% - "${result.chunk.substring(0, 100)}..."`)
        })
      }
    }
    
  } catch (error) {
    console.log(`❌ Real embedding test error: ${error.message}`)
  }
}

async function main() {
  console.log('🚀 Real Search Query Tests\n')
  
  await testRealQueries()
  await testWithRealEmbeddings()
  
  console.log('\n✅ Real search tests completed!')
  console.log('\n💡 Next steps:')
  console.log('   1. Test in browser: http://localhost:5173/search-test')
  console.log('   2. Try the different search modes (Hybrid, Keyword, Semantic)')
  console.log('   3. Compare results between modes')
}

main().catch(console.error)
