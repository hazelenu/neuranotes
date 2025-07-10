import { supabase } from '../lib/supabase'
import { defaultDocuments } from '../data/defaultDocuments'
import { defaultKnowledgeGraphs } from '../data/defaultKnowledgeGraphs'

/**
 * Check if default documents already exist in the database
 * @returns {Promise<boolean>} - True if default documents exist
 */
export const checkDefaultDocumentsExist = async () => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id')
      .eq('is_default', true)
      .limit(1)

    if (error) {
      console.error('Error checking for default documents:', error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Error checking default documents:', error)
    return false
  }
}

/**
 * Insert knowledge graphs for default documents
 * @param {Array} documents - Array of inserted documents with IDs
 * @returns {Promise<boolean>} - True if successful
 */
const insertDefaultKnowledgeGraphs = async (documents) => {
  try {
    console.log('🧠 Inserting default knowledge graphs...')

    let totalInserted = 0

    for (const doc of documents) {
      // Get the appropriate knowledge graph data
      let knowledgeData = []
      if (doc.title.includes("Turing Test")) {
        knowledgeData = defaultKnowledgeGraphs.turingTest
      } else if (doc.title.includes("Steve Jobs")) {
        knowledgeData = defaultKnowledgeGraphs.steveJobs
      } else if (doc.title.includes("Getting Started")) {
        knowledgeData = defaultKnowledgeGraphs.neuraNotes
      }

      if (knowledgeData.length === 0) continue

      // Prepare triplets for insertion
      const tripletsToInsert = knowledgeData.map(triplet => ({
        document_id: doc.id,
        subject: triplet.subject,
        predicate: triplet.predicate,
        object: triplet.object
      }))

      // Insert knowledge graph triplets
      const { error: kgError } = await supabase
        .from('knowledge_graph')
        .insert(tripletsToInsert)

      if (kgError) {
        console.error(`❌ Error inserting knowledge graph for ${doc.title}:`, kgError)
      } else {
        console.log(`✅ Inserted ${tripletsToInsert.length} triplets for "${doc.title}"`)
        totalInserted += tripletsToInsert.length
      }
    }

    console.log(`🎉 Total knowledge triplets inserted: ${totalInserted}`)
    return true

  } catch (error) {
    console.error('❌ Error inserting knowledge graphs:', error)
    return false
  }
}

/**
 * Insert default documents into the database
 * @returns {Promise<boolean>} - True if successful
 */
export const insertDefaultDocuments = async () => {
  try {
    console.log('🚀 Inserting default documents...')

    // Check if default documents already exist
    const defaultsExist = await checkDefaultDocumentsExist()
    if (defaultsExist) {
      console.log('✅ Default documents already exist, skipping insertion')
      return true
    }

    // Prepare documents for insertion
    const documentsToInsert = defaultDocuments.map(doc => ({
      title: doc.title,
      content: doc.content,
      created_at: doc.created_at,
      updated_at: doc.created_at,
      is_default: doc.is_default
    }))

    // Insert documents
    const { data, error } = await supabase
      .from('documents')
      .insert(documentsToInsert)
      .select()

    if (error) {
      console.error('❌ Error inserting default documents:', error)
      return false
    }

    console.log(`✅ Successfully inserted ${data.length} default documents`)

    // Insert knowledge graphs for the new documents
    await insertDefaultKnowledgeGraphs(data)

    return true

  } catch (error) {
    console.error('❌ Error in insertDefaultDocuments:', error)
    return false
  }
}

/**
 * Initialize default documents if they don't exist
 * Call this when the app starts or when a user first visits
 * @returns {Promise<boolean>} - True if successful or already exist
 */
export const initializeDefaultDocuments = async () => {
  try {
    const defaultsExist = await checkDefaultDocumentsExist()
    
    if (defaultsExist) {
      console.log('📚 Default documents already available')
      return true
    }

    console.log('📚 Setting up default documents for new user...')
    const success = await insertDefaultDocuments()
    
    if (success) {
      console.log('🎉 Default documents setup complete!')
    } else {
      console.log('⚠️ Failed to setup default documents')
    }
    
    return success
  } catch (error) {
    console.error('❌ Error initializing default documents:', error)
    return false
  }
}

/**
 * Get all default documents from the database
 * @returns {Promise<Array>} - Array of default documents
 */
export const getDefaultDocuments = async () => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('is_default', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching default documents:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting default documents:', error)
    return []
  }
}

/**
 * Remove all default documents (useful for testing)
 * @returns {Promise<boolean>} - True if successful
 */
export const removeDefaultDocuments = async () => {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('is_default', true)

    if (error) {
      console.error('Error removing default documents:', error)
      return false
    }

    console.log('🗑️ Default documents removed')
    return true
  } catch (error) {
    console.error('Error removing default documents:', error)
    return false
  }
}
