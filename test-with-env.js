// Load environment variables manually
import { readFileSync } from 'fs'
import { join } from 'path'

// Function to load .env file manually
function loadEnvFile(filename) {
  try {
    const envFile = readFileSync(filename, 'utf8')
    const lines = envFile.split('\n')
    
    lines.forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
        if (key && value) {
          process.env[key] = value
        }
      }
    })
    console.log(`✅ Loaded ${filename}`)
  } catch (error) {
    console.log(`⚠️  Could not load ${filename}:`, error.message)
  }
}

// Load environment files
console.log('🔧 Loading environment variables...')
loadEnvFile('.env.local')
loadEnvFile('.env')

// Simple API test
async function testAPI() {
  console.log('\n🧪 Testing API Connection...\n')
  
  // Check environment variables
  console.log('Environment Variables:')
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set')
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set')
  console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL ? '✅ Set' : '❌ Not set')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set')
  
  const baseUrl = 'http://localhost:5173'  // Vite default port
  
  try {
    console.log('\n🔍 Testing API endpoint...')
    const response = await fetch(`${baseUrl}/api/hybrid-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'test query',
        limit: 3,
        useSupabaseFunction: false
      })
    })
    
    console.log(`Status: ${response.status} ${response.statusText}`)
    
    if (response.status === 404) {
      console.log('❌ API endpoint not found.')
      console.log('🔧 Make sure your dev server is running: npm run dev')
      return
    }
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok && data.success) {
      console.log('✅ API is working!')
    } else {
      console.log('⚠️  API returned an error:', data.error || 'Unknown error')
    }
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Start your dev server: npm run dev')
    console.log('2. Make sure it\'s running on http://localhost:3000')
    console.log('3. Check if api/hybrid-search.js exists')
  }
}

// Test a simple search
async function testSimpleSearch() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('\n⚠️  Skipping search test - OPENAI_API_KEY not set')
    return
  }
  
  console.log('\n🔍 Testing simple search...')
  
  try {
    const response = await fetch('http://localhost:5173/api/hybrid-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'artificial intelligence',
        limit: 3,
        useSupabaseFunction: true
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log(`✅ Found ${data.total} results`)
      if (data.results && data.results.length > 0) {
        console.log('First result:', data.results[0].chunk?.substring(0, 100) + '...')
      }
    } else {
      console.log('❌ Search failed:', data.error)
    }
    
  } catch (error) {
    console.log('❌ Search test failed:', error.message)
  }
}

async function main() {
  console.log('🚀 Hybrid Search API Test\n')
  
  await testAPI()
  await testSimpleSearch()
  
  console.log('\n✅ Test completed!')
}

main().catch(console.error)
