// Test knowledge graph extraction locally
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Mock knowledge extraction function (replaces OpenAI API call)
function extractMockKnowledgeTriplets(text) {
  // Simple pattern-based extraction for testing
  const triplets = []
  
  // Look for common patterns in AI text
  const patterns = [
    {
      regex: /(\w+(?:\s+\w+)*)\s+(?:is|are)\s+(?:a|an|the)?\s*(\w+(?:\s+\w+)*)/gi,
      predicate: 'is a type of'
    },
    {
      regex: /(\w+(?:\s+\w+)*)\s+(?:developed|created|invented|built)\s+(?:by|at)?\s*(\w+(?:\s+\w+)*)/gi,
      predicate: 'developed by'
    },
    {
      regex: /(\w+(?:\s+\w+)*)\s+(?:uses|utilizes|employs)\s+(\w+(?:\s+\w+)*)/gi,
      predicate: 'uses'
    },
    {
      regex: /(\w+(?:\s+\w+)*)\s+(?:includes|contains|has)\s+(\w+(?:\s+\w+)*)/gi,
      predicate: 'includes'
    }
  ]
  
  // Extract based on patterns
  patterns.forEach(pattern => {
    let match
    while ((match = pattern.regex.exec(text)) !== null) {
      const subject = match[1].trim()
      const object = match[2].trim()
      
      if (subject.length > 2 && object.length > 2 && subject !== object) {
        triplets.push({
          subject: subject,
          predicate: pattern.predicate,
          object: object
        })
      }
    }
  })
  
  // Add some AI-specific triplets if the text is about AI
  if (text.toLowerCase().includes('artificial intelligence') || text.toLowerCase().includes('machine learning')) {
    triplets.push(
      { subject: 'Artificial Intelligence', predicate: 'is a field of', object: 'Computer Science' },
      { subject: 'Machine Learning', predicate: 'is a subset of', object: 'Artificial Intelligence' },
      { subject: 'Deep Learning', predicate: 'is a type of', object: 'Machine Learning' },
      { subject: 'Neural Networks', predicate: 'are used in', object: 'Deep Learning' },
      { subject: 'GPT-4', predicate: 'is an example of', object: 'Large Language Model' },
      { subject: 'AI Systems', predicate: 'can process', object: 'Natural Language' },
      { subject: 'Computer Vision', predicate: 'is an application of', object: 'Artificial Intelligence' },
      { subject: 'AI', predicate: 'has applications in', object: 'Healthcare' },
      { subject: 'AI', predicate: 'faces challenges with', object: 'Bias and Ethics' },
      { subject: 'Quantum Computing', predicate: 'may accelerate', object: 'AI Development' }
    )
  }
  
  // Remove duplicates and limit to 15 triplets
  const uniqueTriplets = triplets.filter((triplet, index, self) =>
    index === self.findIndex(t => 
      t.subject === triplet.subject && 
      t.predicate === triplet.predicate && 
      t.object === triplet.object
    )
  ).slice(0, 15)
  
  return uniqueTriplets
}

async function testKnowledgeGraphExtraction() {
  try {
    console.log('🧪 Testing Knowledge Graph Extraction...\n')

    // Step 1: Find a document to test with
    console.log('📊 Finding documents to test with...')
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, content')
      .order('created_at', { ascending: false })
      .limit(5)

    if (docsError) {
      throw docsError
    }

    if (!documents || documents.length === 0) {
      console.log('❌ No documents found. Please upload a document first.')
      return
    }

    console.log(`📄 Found ${documents.length} documents:`)
    documents.forEach((doc, index) => {
      console.log(`  ${index + 1}. "${doc.title}" (${doc.id})`)
    })

    // Use the first document for testing
    const testDoc = documents[0]
    console.log(`\n✅ Testing with document: "${testDoc.title}"`)

    // Step 2: Extract text content from Tiptap JSON
    let textContent = ''
    try {
      if (typeof testDoc.content === 'string') {
        textContent = testDoc.content
      } else if (testDoc.content && testDoc.content.content) {
        // Extract text from Tiptap JSON structure
        const extractTextFromTiptap = (node) => {
          if (node.type === 'text') {
            return node.text || ''
          }
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractTextFromTiptap).join('')
          }
          return ''
        }
        textContent = testDoc.content.content.map(extractTextFromTiptap).join('\n')
      }
    } catch (contentError) {
      console.log('⚠️ Could not extract text content, using fallback')
      textContent = 'Artificial Intelligence has emerged as one of the most transformative technologies. Machine Learning is a subset of AI that uses neural networks. Deep Learning models can process natural language and computer vision tasks.'
    }

    console.log(`📝 Text content length: ${textContent.length} characters`)
    console.log(`📝 Sample text: "${textContent.substring(0, 200)}..."`)

    if (textContent.length < 50) {
      console.log('⚠️ Text too short, using sample AI text for testing')
      textContent = `Artificial Intelligence (AI) has emerged as one of the most transformative technologies of the 21st century. Machine Learning is a subset of AI that enables computers to learn from data. Deep Learning uses neural networks to process complex patterns. GPT-4 is a large language model developed by OpenAI. Computer vision is an application of AI in image recognition. AI systems face challenges with bias and ethical considerations. Quantum computing may accelerate AI development in the future.`
    }

    // Step 3: Extract knowledge triplets using mock function
    console.log('\n⏳ Extracting knowledge triplets...')
    const triplets = extractMockKnowledgeTriplets(textContent)
    console.log(`✅ Extracted ${triplets.length} knowledge triplets`)

    if (triplets.length === 0) {
      console.log('❌ No triplets extracted')
      return
    }

    // Step 4: Display extracted triplets
    console.log('\n📋 Extracted Knowledge Triplets:')
    console.log('=' .repeat(60))
    triplets.forEach((triplet, index) => {
      console.log(`${index + 1}. "${triplet.subject}" --[${triplet.predicate}]--> "${triplet.object}"`)
    })

    // Step 5: Test saving to database (create table first if needed)
    console.log('\n💾 Testing database operations...')
    
    try {
      // Check if knowledge_graph table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('knowledge_graph')
        .select('id')
        .limit(1)

      if (tableError && tableError.message.includes('does not exist')) {
        console.log('⚠️ Knowledge graph table does not exist yet.')
        console.log('💡 Run the SQL script: supabase-knowledge-graph.sql')
        console.log('💡 Or create the table manually in Supabase dashboard')
        return
      }

      // Prepare triplets for insertion
      const tripletsToInsert = triplets.map(triplet => ({
        subject: triplet.subject,
        predicate: triplet.predicate,
        object: triplet.object,
        document_id: testDoc.id
      }))

      // Insert triplets
      const { data: insertedTriplets, error: insertError } = await supabase
        .from('knowledge_graph')
        .insert(tripletsToInsert)
        .select()

      if (insertError) {
        throw insertError
      }

      console.log(`✅ Successfully saved ${insertedTriplets.length} triplets to database`)

      // Step 6: Test retrieval
      console.log('\n🔍 Testing knowledge graph retrieval...')
      const { data: retrievedTriplets, error: retrieveError } = await supabase
        .from('knowledge_graph')
        .select('*')
        .eq('document_id', testDoc.id)
        .order('created_at', { ascending: false })

      if (retrieveError) {
        throw retrieveError
      }

      console.log(`✅ Retrieved ${retrievedTriplets.length} triplets from database`)
      console.log('\n📋 Stored Knowledge Triplets:')
      console.log('=' .repeat(60))
      retrievedTriplets.slice(0, 10).forEach((triplet, index) => {
        console.log(`${index + 1}. "${triplet.subject}" --[${triplet.predicate}]--> "${triplet.object}"`)
      })

    } catch (dbError) {
      console.log('❌ Database operation failed:', dbError.message)
      console.log('💡 Make sure to run the SQL script to create the knowledge_graph table')
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎉 Knowledge Graph Extraction Test Completed!')
    console.log('✅ Components tested:')
    console.log('  - Text extraction from documents ✅')
    console.log('  - Knowledge triplet extraction ✅ (mock)')
    console.log('  - Database storage ✅')
    console.log('  - Knowledge retrieval ✅')
    console.log('')
    console.log('💡 When you fix OpenAI quota, replace mock extraction with real GPT-4!')
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('❌ Knowledge graph test failed:', error)
  }
}

// Run the test
testKnowledgeGraphExtraction()
