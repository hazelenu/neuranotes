export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    // Extract text and question from request body
    const { text, question } = req.body

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text field is required and must be a string.' })
    }

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question field is required and must be a string.' })
    }

    if (text.trim().length === 0) {
      return res.status(400).json({ error: 'Text cannot be empty.' })
    }

    if (question.trim().length === 0) {
      return res.status(400).json({ error: 'Question cannot be empty.' })
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured.' })
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful and concise AI assistant that answers user questions based only on the provided text.',
          },
          {
            role: 'user',
            content: `Text:\n${text}\n\nQuestion:\n${question}`,
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    // Check if OpenAI API request was successful
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}))
      console.error('OpenAI API Error:', errorData)
      
      if (openaiResponse.status === 401) {
        return res.status(500).json({ error: 'Invalid OpenAI API key.' })
      } else if (openaiResponse.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' })
      } else {
        return res.status(500).json({ error: 'Failed to generate answer. Please try again.' })
      }
    }

    // Parse OpenAI response
    const data = await openaiResponse.json()

    // Extract answer from response
    const answer = data.choices?.[0]?.message?.content?.trim()

    if (!answer) {
      return res.status(500).json({ error: 'No answer generated. Please try again.' })
    }

    // Return successful response
    return res.status(200).json({ answer })

  } catch (error) {
    console.error('Ask API Error:', error)
    return res.status(500).json({ error: 'Internal server error. Please try again.' })
  }
}
