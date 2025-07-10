// Simple API test for hybrid search
// Make sure your dev server is running first: npm run dev

// Load environment variables from .env files
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '.env.local') })
dotenv.config({ path: join(__dirname, '.env') })

async function testAPI() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 Testing API Connection...\n')
  
  try {
    // Test if the API endpoint exists
    console.log('1. Testing API endpoint existence...')
    const response = await fetch(`${baseUrl}/api/hybrid-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'test',
        limit: 1
      })
    })
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.status === 404) {
      console.log('❌ API endpoint not found. Check if your dev server is running.')
      return
    }
    
    const data = await response.json()
    console.log('   Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ API endpoint is working!')
    } else {
      console.log('⚠️  API returned an error, but endpoint exists')
    }
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('   1. Make sure your dev server is running: npm run dev')
    console.log('   2. Check if the server is running on http://localhost:3000')
    console.log('   3. Verify the api/hybrid-search.js file exists')
  }
}

// Test environment variables
function testEnvVars() {
  console.log('\n🔍 Checking Environment Variables...')
  
  const requiredVars = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`)
    } else {
      console.log(`❌ ${varName}: Not set`)
    }
  })
}

async function main() {
  console.log('🚀 Simple API Test\n')
  
  testEnvVars()
  await testAPI()
  
  console.log('\n✅ Test completed!')
}

main().catch(console.error)
