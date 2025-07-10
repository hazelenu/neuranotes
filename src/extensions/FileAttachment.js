import { Node, mergeAttributes } from '@tiptap/core'

export const FileAttachment = Node.create({
  name: 'fileAttachment',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      fileName: {
        default: null,
      },
      fileContent: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-file-attachment]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-file-attachment': '',
        'class': 'file-attachment',
        'style': `
          display: inline-flex;
          align-items: center;
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 4px 8px;
          margin: 2px;
          cursor: pointer;
          font-size: 13px;
          color: #374151;
          text-decoration: none;
          user-select: none;
        `,
        'title': 'Click to view file content',
      }),
      `📎 ${HTMLAttributes.fileName || 'Unknown file'}`,
    ]
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const span = document.createElement('span')
      
      // Set attributes
      span.setAttribute('data-file-attachment', '')
      span.className = 'file-attachment'
      span.style.cssText = `
        display: inline-flex;
        align-items: center;
        background-color: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 4px 8px;
        margin: 2px;
        cursor: pointer;
        font-size: 13px;
        color: #374151;
        text-decoration: none;
        user-select: none;
      `
      span.title = 'Click to view file content'
      span.textContent = `📎 ${node.attrs.fileName || 'Unknown file'}`
      
      // Add click handler
      span.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        // Show file content in a modal-like alert
        const content = node.attrs.fileContent || 'No content available'
        const fileName = node.attrs.fileName || 'Unknown file'
        
        // Create a simple modal
        showFileModal(fileName, content)
      })
      
      return {
        dom: span,
      }
    }
  },
})

// Simple modal function to show file content
function showFileModal(fileName, content) {
  // Create modal overlay
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `
  
  // Create modal content
  const modal = document.createElement('div')
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    margin: 20px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `
  
  // Create header
  const header = document.createElement('div')
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
  `
  
  const title = document.createElement('h3')
  title.style.cssText = `
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  `
  title.textContent = fileName
  
  const closeButton = document.createElement('button')
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  `
  closeButton.innerHTML = '×'
  closeButton.onclick = () => document.body.removeChild(overlay)
  
  // Create content area
  const contentArea = document.createElement('pre')
  contentArea.style.cssText = `
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 14px;
    line-height: 1.5;
    color: #374151;
    background-color: #f9fafb;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    margin: 0;
    max-height: 400px;
    overflow-y: auto;
  `
  contentArea.textContent = content
  
  // Assemble modal
  header.appendChild(title)
  header.appendChild(closeButton)
  modal.appendChild(header)
  modal.appendChild(contentArea)
  overlay.appendChild(modal)
  
  // Add to page
  document.body.appendChild(overlay)
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay)
    }
  })
  
  // Close on escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(overlay)
      document.removeEventListener('keydown', handleEscape)
    }
  }
  document.addEventListener('keydown', handleEscape)
}
