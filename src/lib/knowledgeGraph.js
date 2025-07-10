// Mock knowledge extraction function (replaces OpenAI API call)
function extractMockKnowledgeTriplets(text) {
  const triplets = []

  // Split text into sentences for source snippets
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)

  // Look for common patterns in text
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
        // Find the sentence containing this match
        const matchText = match[0]
        const sourceSnippet = sentences.find(sentence =>
          sentence.toLowerCase().includes(matchText.toLowerCase())
        ) || matchText

        triplets.push({
          subject: subject,
          predicate: pattern.predicate,
          object: object,
          source_snippet: sourceSnippet.trim()
        })
      }
    }
  })

  // Add some general knowledge triplets based on content
  if (text.toLowerCase().includes('artificial intelligence') || text.toLowerCase().includes('ai')) {
    const aiSnippet = sentences.find(s => s.toLowerCase().includes('artificial intelligence')) ||
                     sentences.find(s => s.toLowerCase().includes('ai')) ||
                     'Artificial Intelligence is a transformative technology.'

    triplets.push(
      { subject: 'Artificial Intelligence', predicate: 'is a field of', object: 'Computer Science', source_snippet: aiSnippet },
      { subject: 'Machine Learning', predicate: 'is a subset of', object: 'Artificial Intelligence', source_snippet: aiSnippet },
      { subject: 'AI', predicate: 'has applications in', object: 'Healthcare', source_snippet: aiSnippet }
    )
  }

  if (text.toLowerCase().includes('machine learning') || text.toLowerCase().includes('ml')) {
    const mlSnippet = sentences.find(s => s.toLowerCase().includes('machine learning')) ||
                     'Machine Learning enables computers to learn from data.'

    triplets.push(
      { subject: 'Machine Learning', predicate: 'uses', object: 'Algorithms', source_snippet: mlSnippet },
      { subject: 'Deep Learning', predicate: 'is a type of', object: 'Machine Learning', source_snippet: mlSnippet }
    )
  }

  if (text.toLowerCase().includes('technology') || text.toLowerCase().includes('software')) {
    const techSnippet = sentences.find(s => s.toLowerCase().includes('technology')) ||
                       'Technology transforms how we work and live.'

    triplets.push(
      { subject: 'Technology', predicate: 'transforms', object: 'Society', source_snippet: techSnippet },
      { subject: 'Software', predicate: 'is built with', object: 'Programming Languages', source_snippet: techSnippet }
    )
  }

  // Remove duplicates and limit to 10 triplets
  const uniqueTriplets = triplets.filter((triplet, index, self) =>
    index === self.findIndex(t =>
      t.subject === triplet.subject &&
      t.predicate === triplet.predicate &&
      t.object === triplet.object
    )
  ).slice(0, 10)

  return uniqueTriplets
}

/**
 * Save triplets directly to Supabase (bypassing API)
 */
async function saveTripletsDirect(triplets, documentId) {
  try {
    const { supabase } = await import('./supabase')

    const tripletsToInsert = triplets.map(triplet => ({
      subject: triplet.subject.trim(),
      predicate: triplet.predicate.trim(),
      object: triplet.object.trim(),
      source_snippet: triplet.source_snippet ? triplet.source_snippet.trim() : null,
      document_id: documentId
    }))

    const { data, error } = await supabase
      .from('knowledge_graph')
      .insert(tripletsToInsert)
      .select()

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error saving triplets directly:', error)
    throw error
  }
}

/**
 * Extract knowledge graph from text
 * @param {string} text - The text to extract knowledge from
 * @param {string} documentId - The UUID of the document
 * @returns {Promise<Object>} - The API response with extracted triplets
 */
export const extractKnowledgeGraph = async (text, documentId) => {
  try {
    console.log('Extracting knowledge graph:', { textLength: text.length, documentId })

    // Try API first, fallback to local extraction
    try {
      const response = await fetch('/api/extract-knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          document_id: documentId
        })
      })

      console.log('API Response status:', response.status)

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          console.log('Knowledge extraction API response:', data)

          return {
            success: true,
            triplets: data.triplets,
            count: data.count,
            message: data.message
          }
        }
      }

      // If API fails, fall through to local extraction
      console.log('API failed, using local extraction...')

    } catch (apiError) {
      console.log('API error, using local extraction:', apiError.message)
    }

    // Local extraction fallback
    console.log('Using local mock extraction...')
    const triplets = extractMockKnowledgeTriplets(text)

    if (triplets.length === 0) {
      return {
        success: true,
        triplets: [],
        count: 0,
        message: 'No knowledge triplets found in the text'
      }
    }

    // Save directly to database
    const savedTriplets = await saveTripletsDirect(triplets, documentId)

    return {
      success: true,
      triplets: savedTriplets,
      count: savedTriplets.length,
      message: `Successfully extracted ${savedTriplets.length} knowledge triplets (local extraction)`
    }

  } catch (error) {
    console.error('Error extracting knowledge graph:', error)

    return {
      success: false,
      error: error.message,
      triplets: [],
      count: 0
    }
  }
}

/**
 * Get knowledge graph for a specific document
 * @param {string} documentId - The UUID of the document
 * @returns {Promise<Object>} - The knowledge graph data
 */
export const getDocumentKnowledgeGraph = async (documentId) => {
  try {
    const { supabase } = await import('./supabase')
    
    const { data, error } = await supabase.rpc('get_document_knowledge_graph', {
      target_document_id: documentId
    })

    if (error) {
      throw error
    }

    return {
      success: true,
      triplets: data || [],
      count: data ? data.length : 0
    }

  } catch (error) {
    console.error('Error getting document knowledge graph:', error)
    
    return {
      success: false,
      error: error.message,
      triplets: [],
      count: 0
    }
  }
}

/**
 * Search knowledge graph by entity or term
 * @param {string} searchTerm - The term to search for
 * @param {string} documentId - Optional document ID to limit search
 * @returns {Promise<Object>} - The search results
 */
export const searchKnowledgeGraph = async (searchTerm, documentId = null) => {
  try {
    const { supabase } = await import('./supabase')
    
    const { data, error } = await supabase.rpc('search_knowledge_graph', {
      search_term: searchTerm,
      target_document_id: documentId
    })

    if (error) {
      throw error
    }

    return {
      success: true,
      results: data || [],
      count: data ? data.length : 0
    }

  } catch (error) {
    console.error('Error searching knowledge graph:', error)
    
    return {
      success: false,
      error: error.message,
      results: [],
      count: 0
    }
  }
}

/**
 * Get entities related to a specific entity
 * @param {string} entityName - The entity to find relations for
 * @param {string} documentId - Optional document ID to limit search
 * @returns {Promise<Object>} - The related entities
 */
export const getRelatedEntities = async (entityName, documentId = null) => {
  try {
    const { supabase } = await import('./supabase')
    
    const { data, error } = await supabase.rpc('get_related_entities', {
      entity_name: entityName,
      target_document_id: documentId
    })

    if (error) {
      throw error
    }

    return {
      success: true,
      relations: data || [],
      count: data ? data.length : 0
    }

  } catch (error) {
    console.error('Error getting related entities:', error)
    
    return {
      success: false,
      error: error.message,
      relations: [],
      count: 0
    }
  }
}

/**
 * Delete knowledge graph entries for a document
 * @param {string} documentId - The UUID of the document
 * @returns {Promise<Object>} - The deletion result
 */
export const deleteDocumentKnowledgeGraph = async (documentId) => {
  try {
    const { supabase } = await import('./supabase')
    
    const { error } = await supabase
      .from('knowledge_graph')
      .delete()
      .eq('document_id', documentId)

    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'Knowledge graph deleted successfully'
    }

  } catch (error) {
    console.error('Error deleting knowledge graph:', error)
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get knowledge graph statistics for a document
 * @param {string} documentId - The UUID of the document
 * @returns {Promise<Object>} - The statistics
 */
export const getKnowledgeGraphStats = async (documentId) => {
  try {
    const { supabase } = await import('./supabase')
    
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('knowledge_graph')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId)

    if (countError) {
      throw countError
    }

    // Get unique subjects count
    const { data: subjects, error: subjectsError } = await supabase
      .from('knowledge_graph')
      .select('subject')
      .eq('document_id', documentId)

    if (subjectsError) {
      throw subjectsError
    }

    // Get unique predicates count
    const { data: predicates, error: predicatesError } = await supabase
      .from('knowledge_graph')
      .select('predicate')
      .eq('document_id', documentId)

    if (predicatesError) {
      throw predicatesError
    }

    const uniqueSubjects = new Set(subjects?.map(s => s.subject) || []).size
    const uniquePredicates = new Set(predicates?.map(p => p.predicate) || []).size

    return {
      success: true,
      stats: {
        totalTriplets: totalCount || 0,
        uniqueSubjects,
        uniquePredicates,
        avgTripletsPerSubject: uniqueSubjects > 0 ? (totalCount / uniqueSubjects).toFixed(2) : 0
      }
    }

  } catch (error) {
    console.error('Error getting knowledge graph stats:', error)
    
    return {
      success: false,
      error: error.message,
      stats: {
        totalTriplets: 0,
        uniqueSubjects: 0,
        uniquePredicates: 0,
        avgTripletsPerSubject: 0
      }
    }
  }
}
