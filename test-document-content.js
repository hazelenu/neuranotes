// Test script to check document content structure
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDocumentContent() {
  console.log('🔍 Testing Document Content Structure\n')
  
  try {
    // Get a few recent documents
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, title, content, created_at')
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (error) {
      console.log('❌ Error fetching documents:', error.message)
      return
    }
    
    if (!documents || documents.length === 0) {
      console.log('⚠️  No documents found in database')
      return
    }
    
    console.log(`📄 Found ${documents.length} documents:\n`)
    
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. Document: "${doc.title}"`)
      console.log(`   ID: ${doc.id}`)
      console.log(`   Created: ${doc.created_at}`)
      console.log(`   Content type: ${typeof doc.content}`)
      
      if (typeof doc.content === 'object') {
        console.log(`   Content structure:`)
        if (doc.content.type) {
          console.log(`     - Type: ${doc.content.type}`)
        }
        if (doc.content.original_content) {
          console.log(`     - Original content: ${doc.content.original_content.substring(0, 100)}...`)
        }
        if (doc.content.content) {
          console.log(`     - Has content array: ${Array.isArray(doc.content.content)}`)
        }
        if (doc.content.file_name) {
          console.log(`     - File name: ${doc.content.file_name}`)
        }
      } else {
        console.log(`   Content preview: ${String(doc.content).substring(0, 100)}...`)
      }
      console.log('')
    })
    
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
}

testDocumentContent().catch(console.error)
