// Process default documents to generate embeddings and knowledge graphs
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
})

// Extract text content from Tiptap JSON
function extractTextFromTiptap(content) {
  if (!content || !content.content) return ''
  
  let text = ''
  
  function extractFromNode(node) {
    if (node.type === 'text') {
      text += node.text + ' '
    } else if (node.content) {
      node.content.forEach(extractFromNode)
    }
  }
  
  content.content.forEach(extractFromNode)
  return text.trim()
}

// Chunk text into smaller pieces for embeddings
function chunkText(text, maxTokens = 200) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks = []
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue
    
    // Rough token estimation (1 token ≈ 4 characters)
    const estimatedTokens = (currentChunk + ' ' + trimmedSentence).length / 4
    
    if (estimatedTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = trimmedSentence
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.length > 0 ? chunks : [text]
}

// Generate embeddings for text chunks
async function generateEmbeddings(textChunks, documentId) {
  console.log(`  📊 Generating embeddings for ${textChunks.length} chunks...`)
  
  const embeddings = []
  
  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i]
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: chunk,
        encoding_format: 'float'
      })
      
      const embedding = response.data[0].embedding
      
      embeddings.push({
        document_id: documentId,
        content: chunk,
        embedding: embedding,
        chunk_index: i
      })
      
      console.log(`    ✅ Generated embedding for chunk ${i + 1}/${textChunks.length}`)
      
    } catch (error) {
      console.error(`    ❌ Error generating embedding for chunk ${i + 1}:`, error.message)
    }
  }
  
  return embeddings
}

// Extract knowledge graph triplets
async function extractKnowledgeGraph(text, documentId) {
  console.log(`  🧠 Extracting knowledge graph...`)
  
  try {
    const prompt = `Extract knowledge triplets from the following text. Return a JSON array of objects with "subject", "predicate", and "object" fields. Focus on important entities, relationships, and concepts.

Text: ${text}

Return only the JSON array, no other text.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    })

    const content = response.choices[0].message.content.trim()
    
    // Try to parse the JSON response
    let triplets = []
    try {
      triplets = JSON.parse(content)
    } catch (parseError) {
      console.warn(`    ⚠️ Could not parse knowledge graph JSON, trying to extract...`)
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        triplets = JSON.parse(jsonMatch[0])
      }
    }
    
    if (!Array.isArray(triplets)) {
      console.warn(`    ⚠️ Knowledge graph extraction did not return an array`)
      return []
    }
    
    // Add document_id to each triplet
    const processedTriplets = triplets.map(triplet => ({
      document_id: documentId,
      subject: triplet.subject,
      predicate: triplet.predicate,
      object: triplet.object
    }))
    
    console.log(`    ✅ Extracted ${processedTriplets.length} knowledge triplets`)
    return processedTriplets
    
  } catch (error) {
    console.error(`    ❌ Error extracting knowledge graph:`, error.message)
    return []
  }
}

// Process a single document
async function processDocument(document) {
  console.log(`\n📄 Processing: "${document.title}"`)
  
  // Extract text content
  const textContent = extractTextFromTiptap(document.content)
  if (!textContent) {
    console.log(`  ⚠️ No text content found, skipping...`)
    return
  }
  
  console.log(`  📝 Extracted ${textContent.length} characters of text`)
  
  // Generate embeddings
  const textChunks = chunkText(textContent)
  const embeddings = await generateEmbeddings(textChunks, document.id)
  
  if (embeddings.length > 0) {
    // Insert embeddings into database
    const { error: embeddingError } = await supabase
      .from('embeddings')
      .insert(embeddings)
    
    if (embeddingError) {
      console.error(`  ❌ Error inserting embeddings:`, embeddingError.message)
    } else {
      console.log(`  ✅ Inserted ${embeddings.length} embeddings`)
    }
  }
  
  // Generate knowledge graph
  const triplets = await extractKnowledgeGraph(textContent, document.id)
  
  if (triplets.length > 0) {
    // Insert knowledge graph into database
    const { error: kgError } = await supabase
      .from('knowledge_graph')
      .insert(triplets)
    
    if (kgError) {
      console.error(`  ❌ Error inserting knowledge graph:`, kgError.message)
    } else {
      console.log(`  ✅ Inserted ${triplets.length} knowledge triplets`)
    }
  }
}

// Main processing function
async function processDefaultDocuments() {
  console.log('🚀 Processing Default Documents for Embeddings and Knowledge Graphs\n')
  
  try {
    // Get all default documents
    const { data: defaultDocs, error } = await supabase
      .from('documents')
      .select('*')
      .eq('is_default', true)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('❌ Error fetching default documents:', error.message)
      return
    }
    
    if (!defaultDocs || defaultDocs.length === 0) {
      console.log('⚠️ No default documents found. Make sure to run the default documents setup first.')
      return
    }
    
    console.log(`📚 Found ${defaultDocs.length} default documents to process`)
    
    // Process each document
    for (const doc of defaultDocs) {
      await processDocument(doc)
    }
    
    console.log('\n🎉 Processing complete!')
    console.log('\n📊 Summary:')
    
    // Get final counts
    const { count: embeddingCount } = await supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
    
    const { count: tripletCount } = await supabase
      .from('knowledge_graph')
      .select('*', { count: 'exact', head: true })
    
    console.log(`   📊 Total embeddings: ${embeddingCount || 0}`)
    console.log(`   🧠 Total knowledge triplets: ${tripletCount || 0}`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

// Run the processing
processDefaultDocuments().catch(console.error)
