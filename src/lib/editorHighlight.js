import { supabase } from './supabase'

/**
 * Find and highlight text in the Tiptap editor
 * @param {Object} editor - Tiptap editor instance
 * @param {string} searchText - Text to find and highlight
 * @param {number} highlightDuration - Duration in milliseconds (default: 2000)
 * @returns {Promise<boolean>} - True if text was found and highlighted
 */
export const highlightTextInEditor = async (editor, searchText, highlightDuration = 2000) => {
  if (!editor || !searchText) {
    return false
  }

  try {
    // Get the editor's DOM element
    const editorDOM = editor.view.dom
    
    // Find all text nodes in the editor
    const textNodes = []
    const walker = document.createTreeWalker(
      editorDOM,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    let node
    while (node = walker.nextNode()) {
      textNodes.push(node)
    }

    // Search for the text (case-insensitive, fuzzy matching)
    let foundNode = null
    let foundOffset = -1
    let foundLength = 0

    // Try exact match first
    for (const textNode of textNodes) {
      const text = textNode.textContent
      const index = text.toLowerCase().indexOf(searchText.toLowerCase())
      
      if (index !== -1) {
        foundNode = textNode
        foundOffset = index
        foundLength = searchText.length
        break
      }
    }

    // If exact match not found, try fuzzy matching (partial words)
    if (!foundNode) {
      const searchWords = searchText.toLowerCase().split(/\s+/).filter(word => word.length > 2)
      
      for (const textNode of textNodes) {
        const text = textNode.textContent.toLowerCase()
        
        // Check if text contains most of the search words
        const matchingWords = searchWords.filter(word => text.includes(word))
        
        if (matchingWords.length >= Math.ceil(searchWords.length * 0.6)) {
          foundNode = textNode
          foundOffset = 0
          foundLength = Math.min(searchText.length, textNode.textContent.length)
          break
        }
      }
    }

    if (!foundNode) {
      console.log('Text not found in editor:', searchText)
      return false
    }

    // Create a range and selection
    const range = document.createRange()
    range.setStart(foundNode, foundOffset)
    range.setEnd(foundNode, foundOffset + foundLength)

    // Scroll the range into view
    const rect = range.getBoundingClientRect()
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      range.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    }

    // Create highlight element
    const highlight = document.createElement('span')
    highlight.style.cssText = `
      background-color: #fef08a;
      padding: 2px 4px;
      border-radius: 3px;
      transition: background-color 0.3s ease;
      box-shadow: 0 0 0 2px #eab308;
    `

    // Wrap the text in highlight
    try {
      range.surroundContents(highlight)
      
      // Remove highlight after duration
      setTimeout(() => {
        if (highlight.parentNode) {
          const parent = highlight.parentNode
          while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight)
          }
          parent.removeChild(highlight)
          parent.normalize() // Merge adjacent text nodes
        }
      }, highlightDuration)

      return true
    } catch (error) {
      // If surroundContents fails, try alternative highlighting
      console.warn('Could not wrap text, using alternative highlighting:', error)
      
      // Alternative: add temporary background to parent element
      const parentElement = foundNode.parentElement
      if (parentElement) {
        const originalBackground = parentElement.style.backgroundColor
        parentElement.style.backgroundColor = '#fef08a'
        parentElement.style.transition = 'background-color 0.3s ease'
        
        // Scroll into view
        parentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        })
        
        setTimeout(() => {
          parentElement.style.backgroundColor = originalBackground
        }, highlightDuration)
        
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error highlighting text in editor:', error)
    return false
  }
}

/**
 * Get source snippets for a node from knowledge graph
 * @param {string} nodeId - The entity name to search for
 * @param {string} documentId - The document ID to search in
 * @returns {Promise<Array>} - Array of source snippets
 */
export const getNodeSourceSnippets = async (nodeId, documentId) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_graph')
      .select('source_snippet, subject, predicate, object')
      .eq('document_id', documentId)
      .or(`subject.ilike.%${nodeId}%,object.ilike.%${nodeId}%`)

    if (error) {
      throw error
    }

    // Filter and deduplicate snippets
    const snippets = []
    const seenSnippets = new Set()

    data?.forEach(triplet => {
      if (triplet.source_snippet && !seenSnippets.has(triplet.source_snippet)) {
        snippets.push({
          snippet: triplet.source_snippet,
          triplet: `${triplet.subject} → ${triplet.predicate} → ${triplet.object}`
        })
        seenSnippets.add(triplet.source_snippet)
      }
    })

    return snippets
  } catch (error) {
    console.error('Error getting node source snippets:', error)
    return []
  }
}

/**
 * Handle node click in knowledge graph - highlight in editor
 * @param {string} nodeId - The clicked node ID
 * @param {string} documentId - The document ID
 * @param {Object} editor - Tiptap editor instance
 * @returns {Promise<Object>} - Result with success status and snippets
 */
export const handleKnowledgeNodeClick = async (nodeId, documentId, editor) => {
  try {
    console.log('Knowledge node clicked:', { nodeId, documentId })

    if (!editor) {
      console.warn('No editor instance available')
      return { success: false, error: 'No editor available' }
    }

    // Get source snippets for this node
    const snippets = await getNodeSourceSnippets(nodeId, documentId)

    if (snippets.length === 0) {
      console.log('No source snippets found for node:', nodeId)
      return { success: false, error: 'No source snippets found' }
    }

    console.log(`Found ${snippets.length} source snippets for node:`, nodeId)

    // Highlight the first snippet in the editor
    const firstSnippet = snippets[0].snippet
    const highlighted = await highlightTextInEditor(editor, firstSnippet, 3000)

    if (highlighted) {
      console.log('Successfully highlighted text in editor')
    } else {
      console.warn('Could not highlight text in editor')
    }

    return {
      success: true,
      highlighted,
      snippets,
      primarySnippet: firstSnippet
    }

  } catch (error) {
    console.error('Error handling knowledge node click:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Show floating list of multiple snippets
 * @param {Array} snippets - Array of snippet objects
 * @param {number} x - X coordinate for positioning
 * @param {number} y - Y coordinate for positioning
 * @param {Function} onSnippetClick - Callback when snippet is clicked
 */
export const showSnippetsList = (snippets, x, y, onSnippetClick) => {
  // Remove existing snippet list
  const existingList = document.getElementById('knowledge-snippets-list')
  if (existingList) {
    existingList.remove()
  }

  if (snippets.length <= 1) {
    return // Don't show list for single snippet
  }

  // Create floating list
  const listContainer = document.createElement('div')
  listContainer.id = 'knowledge-snippets-list'
  listContainer.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    font-family: Inter, sans-serif;
  `

  // Add header
  const header = document.createElement('div')
  header.style.cssText = `
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
    font-size: 14px;
    color: #374151;
  `
  header.textContent = `${snippets.length} Related Snippets`
  listContainer.appendChild(header)

  // Add snippets
  snippets.forEach((snippet, index) => {
    const item = document.createElement('div')
    item.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: background-color 0.2s;
    `
    
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f9fafb'
    })
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent'
    })
    
    item.addEventListener('click', () => {
      if (onSnippetClick) {
        onSnippetClick(snippet.snippet)
      }
      listContainer.remove()
    })

    const snippetText = document.createElement('div')
    snippetText.style.cssText = `
      font-size: 13px;
      color: #374151;
      margin-bottom: 4px;
      line-height: 1.4;
    `
    snippetText.textContent = snippet.snippet.length > 100 
      ? snippet.snippet.substring(0, 100) + '...'
      : snippet.snippet

    const tripletText = document.createElement('div')
    tripletText.style.cssText = `
      font-size: 11px;
      color: #6b7280;
      font-style: italic;
    `
    tripletText.textContent = snippet.triplet

    item.appendChild(snippetText)
    item.appendChild(tripletText)
    listContainer.appendChild(item)
  })

  // Add close button
  const closeButton = document.createElement('button')
  closeButton.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    font-size: 18px;
    color: #6b7280;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  `
  closeButton.innerHTML = '×'
  closeButton.addEventListener('click', () => {
    listContainer.remove()
  })
  listContainer.appendChild(closeButton)

  // Add to page
  document.body.appendChild(listContainer)

  // Remove on outside click
  const handleOutsideClick = (event) => {
    if (!listContainer.contains(event.target)) {
      listContainer.remove()
      document.removeEventListener('click', handleOutsideClick)
    }
  }
  
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick)
  }, 100)
}
