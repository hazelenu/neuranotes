// Test OpenAI API key
import dotenv from 'dotenv'

dotenv.config()

async function testOpenAIKey() {
  console.log('🧪 Testing OpenAI API Key\n')
  
  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  
  console.log('Environment variables:')
  console.log('VITE_OPENAI_API_KEY:', process.env.VITE_OPENAI_API_KEY ? '✅ Set' : '❌ Not set')
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set')
  console.log('Using API key:', apiKey ? apiKey.substring(0, 20) + '...' : 'None found')
  
  if (!apiKey) {
    console.log('❌ No OpenAI API key found')
    return
  }
  
  try {
    console.log('\n🚀 Testing OpenAI API call...')
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: 'test query',
        encoding_format: 'float',
      })
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Error response:', errorText)
      
      try {
        const errorJson = JSON.parse(errorText)
        console.log('❌ Parsed error:', errorJson)
      } catch (e) {
        console.log('❌ Could not parse error as JSON')
      }
      return
    }
    
    const data = await response.json()
    console.log('✅ Success! Embedding generated')
    console.log('Embedding length:', data.data[0].embedding.length)
    console.log('First few values:', data.data[0].embedding.slice(0, 5))
    
  } catch (error) {
    console.log('❌ Network/fetch error:', error.message)
  }
}

testOpenAIKey().catch(console.error)
