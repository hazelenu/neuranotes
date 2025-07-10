// Simple script to process default documents using existing utility functions
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

// Call the existing API endpoints to process documents
async function processDocumentViaAPI(documentId, content) {
  const baseUrl = 'http://localhost:5173'
  
  try {
    console.log(`  📊 Generating embeddings via API...`)
    
    // Call embeddings API
    const embeddingResponse = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        documentId: documentId
      })
    })
    
    if (!embeddingResponse.ok) {
      console.error(`  ❌ Embedding API error: ${embeddingResponse.status}`)
    } else {
      const embeddingResult = await embeddingResponse.json()
      console.log(`  ✅ Generated ${embeddingResult.chunks || 0} embeddings`)
    }
    
    console.log(`  🧠 Extracting knowledge graph via API...`)
    
    // Call knowledge graph API
    const kgResponse = await fetch(`${baseUrl}/api/knowledge-graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        documentId: documentId
      })
    })
    
    if (!kgResponse.ok) {
      console.error(`  ❌ Knowledge graph API error: ${kgResponse.status}`)
    } else {
      const kgResult = await kgResponse.json()
      console.log(`  ✅ Extracted ${kgResult.count || 0} knowledge triplets`)
    }
    
  } catch (error) {
    console.error(`  ❌ API call error:`, error.message)
  }
}

// Process documents directly in database
async function processDocumentDirect(document) {
  console.log(`\n📄 Processing: "${document.title}"`)
  
  // Extract text content
  const textContent = extractTextFromTiptap(document.content)
  if (!textContent) {
    console.log(`  ⚠️ No text content found, skipping...`)
    return
  }
  
  console.log(`  📝 Extracted ${textContent.length} characters of text`)
  
  // Check if already processed
  const { data: existingEmbeddings } = await supabase
    .from('embeddings')
    .select('id')
    .eq('document_id', document.id)
    .limit(1)
  
  const { data: existingKG } = await supabase
    .from('knowledge_graph')
    .select('id')
    .eq('document_id', document.id)
    .limit(1)
  
  if (existingEmbeddings && existingEmbeddings.length > 0) {
    console.log(`  ✅ Embeddings already exist, skipping...`)
  } else {
    console.log(`  📊 Need to generate embeddings`)
  }
  
  if (existingKG && existingKG.length > 0) {
    console.log(`  ✅ Knowledge graph already exists, skipping...`)
  } else {
    console.log(`  🧠 Need to generate knowledge graph`)
  }
  
  // If both exist, skip processing
  if ((existingEmbeddings && existingEmbeddings.length > 0) && 
      (existingKG && existingKG.length > 0)) {
    console.log(`  ⏭️ Document already fully processed`)
    return
  }
  
  // Try API approach first
  console.log(`  🔄 Processing via API endpoints...`)
  await processDocumentViaAPI(document.id, textContent)
}

// Main function
async function processDefaultDocuments() {
  console.log('🚀 Processing Default Documents\n')
  
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
      console.log('💡 Make sure to run the default documents setup first.')
      return
    }
    
    console.log(`📚 Found ${defaultDocs.length} default documents:`)
    defaultDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.title}`)
    })
    
    // Process each document
    for (const doc of defaultDocs) {
      await processDocument(doc)
    }
    
    console.log('\n🎉 Processing complete!')
    
    // Get final counts
    const { count: embeddingCount } = await supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
    
    const { count: tripletCount } = await supabase
      .from('knowledge_graph')
      .select('*', { count: 'exact', head: true })
    
    const { count: docCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
    
    console.log('\n📊 Final Summary:')
    console.log(`   📄 Total documents: ${docCount || 0}`)
    console.log(`   📊 Total embeddings: ${embeddingCount || 0}`)
    console.log(`   🧠 Total knowledge triplets: ${tripletCount || 0}`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

// Run the processing
processDefaultDocuments().catch(console.error)
