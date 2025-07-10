// Test script for default documents
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { defaultDocuments } from './src/data/defaultDocuments.js'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDefaultDocuments() {
  console.log('🧪 Testing Default Documents Setup\n')
  
  try {
    // Check if is_default column exists
    console.log('1. Checking database schema...')
    const { data: columns, error: schemaError } = await supabase
      .from('documents')
      .select('*')
      .limit(1)
    
    if (schemaError) {
      console.log('❌ Schema check failed:', schemaError.message)
      console.log('💡 Make sure to run add-default-documents-column.sql first')
      return
    }
    
    console.log('✅ Database schema looks good')
    
    // Check current default documents
    console.log('\n2. Checking existing default documents...')
    const { data: existing, error: existingError } = await supabase
      .from('documents')
      .select('id, title, is_default')
      .eq('is_default', true)
    
    if (existingError) {
      console.log('❌ Error checking existing documents:', existingError.message)
      return
    }
    
    console.log(`📄 Found ${existing?.length || 0} existing default documents`)
    existing?.forEach(doc => {
      console.log(`   - ${doc.title}`)
    })
    
    // Insert default documents if none exist
    if (!existing || existing.length === 0) {
      console.log('\n3. Inserting default documents...')
      
      const documentsToInsert = defaultDocuments.map(doc => ({
        title: doc.title,
        content: doc.content,
        created_at: doc.created_at,
        updated_at: doc.created_at,
        is_default: doc.is_default
      }))
      
      const { data: inserted, error: insertError } = await supabase
        .from('documents')
        .insert(documentsToInsert)
        .select('id, title')
      
      if (insertError) {
        console.log('❌ Error inserting documents:', insertError.message)
        return
      }
      
      console.log(`✅ Successfully inserted ${inserted.length} default documents:`)
      inserted.forEach(doc => {
        console.log(`   - ${doc.title} (ID: ${doc.id})`)
      })
    } else {
      console.log('✅ Default documents already exist, skipping insertion')
    }
    
    // Final verification
    console.log('\n4. Final verification...')
    const { data: final, error: finalError } = await supabase
      .from('documents')
      .select('id, title, is_default, created_at')
      .eq('is_default', true)
      .order('created_at', { ascending: true })
    
    if (finalError) {
      console.log('❌ Final verification failed:', finalError.message)
      return
    }
    
    console.log(`🎉 Setup complete! Found ${final.length} default documents:`)
    final.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.title}`)
      console.log(`      ID: ${doc.id}`)
      console.log(`      Created: ${new Date(doc.created_at).toLocaleString()}`)
    })
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message)
  }
}

async function removeDefaultDocuments() {
  console.log('🗑️ Removing all default documents...')
  
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('is_default', true)
    
    if (error) {
      console.log('❌ Error removing documents:', error.message)
      return
    }
    
    console.log('✅ All default documents removed')
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
}

// Check command line arguments
const command = process.argv[2]

if (command === 'remove') {
  removeDefaultDocuments().catch(console.error)
} else {
  testDefaultDocuments().catch(console.error)
}
