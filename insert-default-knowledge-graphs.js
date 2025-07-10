// Insert pre-generated knowledge graphs for default documents
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { defaultKnowledgeGraphs } from './src/data/defaultKnowledgeGraphs.js'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function insertDefaultKnowledgeGraphs() {
  console.log('🧠 Inserting Default Knowledge Graphs\n')
  
  try {
    // Get all default documents
    const { data: defaultDocs, error } = await supabase
      .from('documents')
      .select('id, title')
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
      console.log(`   ${index + 1}. ${doc.title} (ID: ${doc.id})`)
    })
    
    let totalInserted = 0
    
    // Process each document
    for (const doc of defaultDocs) {
      console.log(`\n📄 Processing: "${doc.title}"`)
      
      // Check if knowledge graph already exists
      const { data: existing, error: checkError } = await supabase
        .from('knowledge_graph')
        .select('id')
        .eq('document_id', doc.id)
        .limit(1)
      
      if (checkError) {
        console.error(`  ❌ Error checking existing data:`, checkError.message)
        continue
      }
      
      if (existing && existing.length > 0) {
        console.log(`  ✅ Knowledge graph already exists, skipping...`)
        continue
      }
      
      // Get the appropriate knowledge graph data
      let knowledgeData = []
      if (doc.title.includes("Turing Test")) {
        knowledgeData = defaultKnowledgeGraphs.turingTest
        console.log(`  🎯 Using Turing Test knowledge graph (${knowledgeData.length} triplets)`)
      } else if (doc.title.includes("Steve Jobs")) {
        knowledgeData = defaultKnowledgeGraphs.steveJobs
        console.log(`  🎯 Using Steve Jobs knowledge graph (${knowledgeData.length} triplets)`)
      } else if (doc.title.includes("Getting Started")) {
        knowledgeData = defaultKnowledgeGraphs.neuraNotes
        console.log(`  🎯 Using NeuraNotes knowledge graph (${knowledgeData.length} triplets)`)
      } else {
        console.log(`  ⚠️ No matching knowledge graph found for this document`)
        continue
      }
      
      if (knowledgeData.length === 0) {
        console.log(`  ⚠️ No knowledge data to insert`)
        continue
      }
      
      // Prepare triplets for insertion
      const tripletsToInsert = knowledgeData.map(triplet => ({
        document_id: doc.id,
        subject: triplet.subject,
        predicate: triplet.predicate,
        object: triplet.object
      }))
      
      // Insert knowledge graph triplets
      const { data: inserted, error: insertError } = await supabase
        .from('knowledge_graph')
        .insert(tripletsToInsert)
        .select('id')
      
      if (insertError) {
        console.error(`  ❌ Error inserting knowledge graph:`, insertError.message)
        continue
      }
      
      const insertedCount = inserted ? inserted.length : tripletsToInsert.length
      console.log(`  ✅ Inserted ${insertedCount} knowledge triplets`)
      totalInserted += insertedCount
    }
    
    console.log('\n🎉 Knowledge graph insertion complete!')
    
    // Get final statistics
    const { count: totalTriplets } = await supabase
      .from('knowledge_graph')
      .select('*', { count: 'exact', head: true })
    
    const { data: allTriplets } = await supabase
      .from('knowledge_graph')
      .select('subject, object')
    
    const entities = new Set()
    allTriplets?.forEach(triplet => {
      entities.add(triplet.subject)
      entities.add(triplet.object)
    })
    
    const { count: documentsWithKG } = await supabase
      .from('knowledge_graph')
      .select('document_id', { count: 'exact', head: true })
    
    console.log('\n📊 Final Statistics:')
    console.log(`   🧠 Total triplets: ${totalTriplets || 0}`)
    console.log(`   👥 Unique entities: ${entities.size}`)
    console.log(`   📄 Documents with KG: ${documentsWithKG || 0}`)
    console.log(`   ➕ Newly inserted: ${totalInserted}`)
    
    console.log('\n🎯 Next Steps:')
    console.log('   1. Visit http://localhost:5173/knowledge to see the knowledge graphs')
    console.log('   2. Try selecting different documents to explore their connections')
    console.log('   3. Use the global view to see all relationships together')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

async function removeDefaultKnowledgeGraphs() {
  console.log('🗑️ Removing default knowledge graphs...')
  
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
    
    // Remove knowledge graphs for default documents
    const { error } = await supabase
      .from('knowledge_graph')
      .delete()
      .in('document_id', documentIds)
    
    if (error) {
      console.error('❌ Error removing knowledge graphs:', error.message)
      return
    }
    
    console.log('✅ Default knowledge graphs removed')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Check command line arguments
const command = process.argv[2]

if (command === 'remove') {
  removeDefaultKnowledgeGraphs().catch(console.error)
} else {
  insertDefaultKnowledgeGraphs().catch(console.error)
}
