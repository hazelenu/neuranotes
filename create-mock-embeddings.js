// Create mock embeddings for default documents to enable search
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

// Chunk text into smaller pieces
function chunkText(text, maxWords = 100) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks = []
  let currentChunk = ''
  let wordCount = 0
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue
    
    const sentenceWords = trimmedSentence.split(/\s+/).length
    
    if (wordCount + sentenceWords > maxWords && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = trimmedSentence
      wordCount = sentenceWords
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence
      wordCount += sentenceWords
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.length > 0 ? chunks : [text]
}

// Create a simple mock embedding (just zeros - for FTS search only)
function createMockEmbedding() {
  // Create a 1536-dimension vector of zeros
  // This won't work for semantic search but will allow FTS to work
  return new Array(1536).fill(0)
}

async function createMockEmbeddings() {
  console.log('📊 Creating Mock Embeddings for Default Documents\n')
  
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
      console.log('⚠️ No default documents found.')
      return
    }
    
    console.log(`📚 Found ${defaultDocs.length} default documents`)
    
    let totalEmbeddings = 0
    
    for (const doc of defaultDocs) {
      console.log(`\n📄 Processing: "${doc.title}"`)
      
      // Check if embeddings already exist
      const { data: existing } = await supabase
        .from('embeddings')
        .select('id')
        .eq('document_id', doc.id)
        .limit(1)
      
      if (existing && existing.length > 0) {
        console.log(`  ✅ Embeddings already exist, skipping...`)
        continue
      }
      
      // Extract text content
      const textContent = extractTextFromTiptap(doc.content)
      if (!textContent) {
        console.log(`  ⚠️ No text content found, skipping...`)
        continue
      }
      
      console.log(`  📝 Extracted ${textContent.length} characters of text`)
      
      // Create chunks
      const chunks = chunkText(textContent)
      console.log(`  📦 Created ${chunks.length} chunks`)
      
      // Create mock embeddings for each chunk
      const embeddingsToInsert = chunks.map((chunk, index) => ({
        document_id: doc.id,
        content: chunk,
        embedding: createMockEmbedding(),
        chunk_index: index
      }))
      
      // Insert embeddings
      const { error: insertError } = await supabase
        .from('embeddings')
        .insert(embeddingsToInsert)
      
      if (insertError) {
        console.error(`  ❌ Error inserting embeddings:`, insertError.message)
      } else {
        console.log(`  ✅ Inserted ${embeddingsToInsert.length} mock embeddings`)
        totalEmbeddings += embeddingsToInsert.length
      }
    }
    
    console.log('\n🎉 Mock embeddings creation complete!')
    console.log(`📊 Total embeddings created: ${totalEmbeddings}`)
    
    // Get final statistics
    const { count: totalCount } = await supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Total embeddings in database: ${totalCount || 0}`)
    
    console.log('\n🔍 Now you can:')
    console.log('   1. Use hybrid search to find content in default documents')
    console.log('   2. Search will work with FTS (Full Text Search)')
    console.log('   3. Try searching for: "machine learning", "Steve Jobs", "NeuraNotes"')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

async function removeMockEmbeddings() {
  console.log('🗑️ Removing mock embeddings for default documents...')
  
  try {
    // Get default document IDs
    const { data: defaultDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('is_default', true)
    
    if (!defaultDocs || defaultDocs.length === 0) {
      console.log('⚠️ No default documents found')
      return
    }
    
    const documentIds = defaultDocs.map(doc => doc.id)
    
    // Remove embeddings for default documents
    const { error } = await supabase
      .from('embeddings')
      .delete()
      .in('document_id', documentIds)
    
    if (error) {
      console.error('❌ Error removing embeddings:', error.message)
      return
    }
    
    console.log('✅ Mock embeddings removed')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Check command line arguments
const command = process.argv[2]

if (command === 'remove') {
  removeMockEmbeddings().catch(console.error)
} else {
  createMockEmbeddings().catch(console.error)
}
