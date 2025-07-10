// Test the RAG API directly
import fetch from 'node-fetch'

async function testRAGAPI() {
  try {
    console.log('Testing RAG API directly...')
    
    // Test with your Hello document ID
    const documentId = 'f13162b2-21c8-4e01-9f3e-268e018ba5a5'
    const question = 'What is artificial intelligence?'
    
    console.log('Making request to API...')
    
    const response = await fetch('http://localhost:3000/api/ask-rag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        documentId
      })
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers))
    
    const text = await response.text()
    console.log('Raw response:', text)
    
    try {
      const data = JSON.parse(text)
      console.log('Parsed JSON:', data)
    } catch (parseError) {
      console.log('Failed to parse as JSON:', parseError.message)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testRAGAPI()
