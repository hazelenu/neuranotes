// Test script for hybrid search API
// Run this with: node test-hybrid-search.js

// Load environment variables from .env files
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '.env.local') })
dotenv.config({ path: join(__dirname, '.env') })

async function testHybridSearch() {
  const baseUrl = 'http://localhost:3000' // Adjust if your dev server runs on different port
  
  const testQueries = [
    'artificial intelligence',
    'machine learning algorithms',
    'neural networks',
    'data science'
  ]

  console.log('🧪 Testing Hybrid Search API...\n')

  for (const query of testQueries) {
    console.log(`🔍 Testing query: "${query}"`)
    
    try {
      const response = await fetch(`${baseUrl}/api/hybrid-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          limit: 5,
          ftsWeight: 0.5,
          vectorWeight: 0.5,
          useSupabaseFunction: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      console.log(`✅ Success! Found ${data.total} results`)
      console.log(`📊 Method: ${data.method}`)
      
      if (data.results && data.results.length > 0) {
        console.log('📝 Top result:')
        const topResult = data.results[0]
        console.log(`   Score: ${(topResult.hybrid_score * 100).toFixed(1)}%`)
        console.log(`   Text: ${topResult.chunk.substring(0, 100)}...`)
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
    
    console.log('---\n')
  }
}

// Test different search modes
async function testSearchModes() {
  const baseUrl = 'http://localhost:3000'
  const query = 'artificial intelligence'
  
  console.log('🎯 Testing Different Search Modes...\n')
  
  const modes = [
    { name: 'Balanced Hybrid', ftsWeight: 0.5, vectorWeight: 0.5 },
    { name: 'Keyword Focused', ftsWeight: 0.8, vectorWeight: 0.2 },
    { name: 'Semantic Focused', ftsWeight: 0.2, vectorWeight: 0.8 }
  ]

  for (const mode of modes) {
    console.log(`🔍 Testing ${mode.name} (FTS: ${mode.ftsWeight}, Vector: ${mode.vectorWeight})`)
    
    try {
      const response = await fetch(`${baseUrl}/api/hybrid-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          limit: 3,
          ftsWeight: mode.ftsWeight,
          vectorWeight: mode.vectorWeight,
          useSupabaseFunction: false // Test JavaScript merging
        })
      })

      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ Found ${data.total} results`)
        data.results.forEach((result, i) => {
          console.log(`   ${i+1}. Score: ${(result.hybrid_score * 100).toFixed(1)}% - ${result.chunk.substring(0, 80)}...`)
        })
      } else {
        console.log(`❌ Error: ${data.error}`)
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
    
    console.log('---\n')
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting Hybrid Search Tests\n')
  
  await testHybridSearch()
  await testSearchModes()
  
  console.log('✅ All tests completed!')
}

// Check if we're running this directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error)
}

export { testHybridSearch, testSearchModes }
