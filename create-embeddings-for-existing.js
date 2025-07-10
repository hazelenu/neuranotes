// Script to create embeddings for existing documents
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Create mock embeddings for existing documents
 */
async function createMockEmbeddingsForExistingDocs() {
  try {
    console.log('🔄 Creating mock embeddings for existing documents...\n')

    // Get all documents that don't have embeddings
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, content')

    if (docsError) {
      throw docsError
    }

    if (!documents || documents.length === 0) {
      console.log('❌ No documents found.')
      return
    }

    console.log(`📄 Found ${documents.length} documents`)

    for (const doc of documents) {
      console.log(`\n📝 Processing: ${doc.title} (${doc.id})`)

      // Check if this document already has embeddings
      const { data: existingEmbeddings, error: checkError } = await supabase
        .from('embeddings')
        .select('id')
        .eq('document_id', doc.id)
        .limit(1)

      if (checkError) {
        console.error(`❌ Error checking embeddings for ${doc.title}:`, checkError)
        continue
      }

      if (existingEmbeddings && existingEmbeddings.length > 0) {
        console.log(`✅ ${doc.title} already has embeddings, skipping...`)
        continue
      }

      // Extract text content from the document
      let textContent = ''
      
      if (doc.content && typeof doc.content === 'object') {
        // Extract text from Tiptap JSON content
        textContent = extractTextFromTiptapContent(doc.content)
      } else if (typeof doc.content === 'string') {
        textContent = doc.content
      }

      if (!textContent || textContent.trim().length < 10) {
        console.log(`⚠️ ${doc.title} has no meaningful content, skipping...`)
        continue
      }

      console.log(`📊 Content length: ${textContent.length} characters`)

      // Split into chunks
      const chunks = splitIntoChunks(textContent)
      console.log(`🔪 Split into ${chunks.length} chunks`)

      if (chunks.length === 0) {
        console.log(`⚠️ No chunks created for ${doc.title}`)
        continue
      }

      // Create mock embeddings for each chunk
      const embeddingData = []
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        
        // Create mock embedding (1536 random numbers between -1 and 1)
        const mockEmbedding = Array.from({ length: 1536 }, () => (Math.random() - 0.5) * 2)
        
        embeddingData.push({
          document_id: doc.id,
          chunk: chunk,
          embedding: mockEmbedding
        })
      }

      // Insert embeddings into Supabase
      const { error: insertError } = await supabase
        .from('embeddings')
        .insert(embeddingData)

      if (insertError) {
        console.error(`❌ Error inserting embeddings for ${doc.title}:`, insertError)
        continue
      }

      console.log(`✅ Created ${embeddingData.length} mock embeddings for ${doc.title}`)
    }

    console.log('\n🎉 Finished processing all documents!')
    
    // Show summary
    const { data: totalEmbeddings, error: countError } = await supabase
      .from('embeddings')
      .select('id', { count: 'exact' })

    if (!countError) {
      console.log(`📊 Total embeddings in database: ${totalEmbeddings.length}`)
    }

  } catch (error) {
    console.error('❌ Error creating embeddings:', error)
  }
}

/**
 * Extract text from Tiptap JSON content
 */
function extractTextFromTiptapContent(content) {
  if (!content || !content.content) return ''
  
  let text = ''
  
  const extractText = (node) => {
    if (node.type === 'text') {
      text += node.text || ''
    } else if (node.content) {
      node.content.forEach(extractText)
    }
    
    // Add spacing for block elements
    if (node.type === 'paragraph' || node.type === 'heading') {
      text += '\n\n'
    }
  }
  
  content.content.forEach(extractText)
  return text.trim()
}

/**
 * Split text into chunks of approximately 200 tokens each
 */
function splitIntoChunks(text) {
  const targetChunkSize = 800 // ~200 tokens * 4 chars/token
  const chunks = []
  
  // First, split by paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > targetChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 0)
}

// Run the script
createMockEmbeddingsForExistingDocs()
