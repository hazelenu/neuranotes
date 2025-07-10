// Debug script to test knowledge graph click functionality
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugKnowledgeClick() {
  try {
    console.log('🔍 Debugging knowledge graph click functionality...\n')

    // Step 1: Check if source_snippet column exists
    console.log('📊 Checking knowledge_graph table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('knowledge_graph')
      .select('*')
      .limit(1)

    if (tableError) {
      console.log('❌ Error accessing knowledge_graph table:', tableError.message)
      console.log('💡 Make sure to run the SQL script to create/update the table')
      return
    }

    if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Table exists. Sample record structure:')
      console.log('   Columns:', Object.keys(tableInfo[0]))
      
      if (!tableInfo[0].hasOwnProperty('source_snippet')) {
        console.log('⚠️  source_snippet column missing!')
        console.log('💡 Run this SQL in Supabase:')
        console.log('   ALTER TABLE knowledge_graph ADD COLUMN source_snippet TEXT;')
      } else {
        console.log('✅ source_snippet column exists')
      }
    }

    // Step 2: Check existing knowledge graph data
    console.log('\n📋 Checking existing knowledge graph data...')
    const { data: allTriplets, error: tripletsError } = await supabase
      .from('knowledge_graph')
      .select('id, subject, object, source_snippet, document_id')
      .limit(10)

    if (tripletsError) {
      console.log('❌ Error fetching triplets:', tripletsError.message)
      return
    }

    if (!allTriplets || allTriplets.length === 0) {
      console.log('❌ No knowledge triplets found in database')
      console.log('💡 Upload a document first to create knowledge triplets')
      return
    }

    console.log(`✅ Found ${allTriplets.length} knowledge triplets`)
    
    // Show sample triplets
    console.log('\n📝 Sample triplets:')
    allTriplets.slice(0, 5).forEach((triplet, index) => {
      console.log(`${index + 1}. "${triplet.subject}" → "${triplet.object}"`)
      console.log(`   Document: ${triplet.document_id}`)
      console.log(`   Source snippet: ${triplet.source_snippet ? `"${triplet.source_snippet.substring(0, 100)}..."` : 'NULL'}`)
      console.log('')
    })

    // Step 3: Test the click functionality simulation
    console.log('🧪 Testing click functionality simulation...')
    
    const testNodeId = allTriplets[0].subject
    const testDocumentId = allTriplets[0].document_id
    
    console.log(`\n🎯 Simulating click on node: "${testNodeId}"`)
    console.log(`📄 In document: ${testDocumentId}`)

    // Simulate the getNodeSourceSnippets function
    const { data: nodeSnippets, error: snippetsError } = await supabase
      .from('knowledge_graph')
      .select('source_snippet, subject, predicate, object')
      .eq('document_id', testDocumentId)
      .or(`subject.ilike.%${testNodeId}%,object.ilike.%${testNodeId}%`)

    if (snippetsError) {
      console.log('❌ Error getting node snippets:', snippetsError.message)
      return
    }

    console.log(`✅ Found ${nodeSnippets ? nodeSnippets.length : 0} related triplets`)

    if (nodeSnippets && nodeSnippets.length > 0) {
      console.log('\n📝 Related snippets:')
      nodeSnippets.forEach((snippet, index) => {
        console.log(`${index + 1}. Triplet: "${snippet.subject}" → ${snippet.predicate} → "${snippet.object}"`)
        console.log(`   Source: ${snippet.source_snippet || 'No source snippet'}`)
        console.log('')
      })

      // Check if we have actual source snippets
      const snippetsWithSource = nodeSnippets.filter(s => s.source_snippet && s.source_snippet.trim())
      
      if (snippetsWithSource.length === 0) {
        console.log('⚠️  No source snippets found!')
        console.log('💡 This means existing triplets were created without source snippets')
        console.log('💡 Upload a new document to create triplets with source snippets')
      } else {
        console.log(`✅ Found ${snippetsWithSource.length} triplets with source snippets`)
        console.log('🎉 Click functionality should work!')
      }
    } else {
      console.log('❌ No related triplets found for this node')
    }

    // Step 4: Check documents
    console.log('\n📚 Checking available documents...')
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (docsError) {
      console.log('❌ Error fetching documents:', docsError.message)
      return
    }

    console.log(`✅ Found ${documents ? documents.length : 0} documents:`)
    documents?.forEach((doc, index) => {
      console.log(`${index + 1}. "${doc.title}" (${doc.id})`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('🔍 Debug Summary:')
    console.log('='.repeat(60))
    console.log(`✅ Database connection: Working`)
    console.log(`${tableInfo ? '✅' : '❌'} Knowledge graph table: ${tableInfo ? 'Exists' : 'Missing'}`)
    console.log(`${allTriplets?.length > 0 ? '✅' : '❌'} Knowledge triplets: ${allTriplets?.length || 0} found`)
    
    const hasSourceSnippets = allTriplets?.some(t => t.source_snippet && t.source_snippet.trim())
    console.log(`${hasSourceSnippets ? '✅' : '⚠️ '} Source snippets: ${hasSourceSnippets ? 'Available' : 'Missing'}`)
    
    console.log('')
    
    if (!hasSourceSnippets) {
      console.log('🚨 ISSUE FOUND: No source snippets in existing triplets')
      console.log('💡 SOLUTION: Upload a new document to create triplets with source snippets')
      console.log('💡 OR: Run the updated SQL script to add the source_snippet column')
    } else {
      console.log('🎉 Everything looks good! Click functionality should work.')
      console.log('💡 Make sure you have a document open in the editor when testing')
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error)
  }
}

// Run the debug script
debugKnowledgeClick()
