/**
 * Ask a question about a specific document using RAG
 * @param {string} question - The user's question
 * @param {string} documentId - The UUID of the document to search
 * @returns {Promise<Object>} - The API response with answer
 */
export const askDocumentQuestion = async (question, documentId) => {
  try {
    console.log('Asking question about document:', { question, documentId })

    const response = await fetch('/api/ask-rag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question.trim(),
        documentId: documentId
      })
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)

    // Check if response is actually JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text()
      console.log('Non-JSON response:', textResponse)
      throw new Error(`Server returned non-JSON response: ${textResponse}`)
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('RAG response:', data)

    return {
      success: true,
      answer: data.answer,
      chunksUsed: data.chunksUsed,
      context: data.context
    }

  } catch (error) {
    console.error('Error asking document question:', error)

    return {
      success: false,
      error: error.message,
      answer: null
    }
  }
}

/**
 * Ask a question about all documents (global search)
 * @param {string} question - The user's question
 * @returns {Promise<Object>} - The API response with answer
 */
export const askGlobalQuestion = async (question) => {
  try {
    console.log('Asking global question:', question)
    
    const response = await fetch('/api/ask-rag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question.trim(),
        documentId: null // null means search all documents
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Global RAG response:', data)
    
    return {
      success: true,
      answer: data.answer,
      chunksUsed: data.chunksUsed,
      context: data.context
    }

  } catch (error) {
    console.error('Error asking global question:', error)
    
    return {
      success: false,
      error: error.message,
      answer: null
    }
  }
}
