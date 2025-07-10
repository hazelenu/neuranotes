import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { embedDocument } from '../lib/embeddings'
import { extractKnowledgeGraph } from '../lib/knowledgeGraph'

const FileUpload = ({ editor, onUpload }) => {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Vector embedding function is now imported from ../lib/embeddings

  const handleFileRead = async (content, fileName) => {
    if (!editor) {
      alert('Editor not available')
      return
    }

    try {
      setIsUploading(true)

      // Insert a clickable file attachment using the custom Tiptap node
      editor.chain().focus().insertContent({
        type: 'fileAttachment',
        attrs: {
          fileName: fileName,
          fileContent: content
        }
      }).run()

      // Prompt user for document title (default to filename without extension)
      const defaultTitle = fileName.replace(/\.[^/.]+$/, "")
      const title = prompt('Enter a title for this document:', defaultTitle)

      if (!title || title.trim() === '') {
        setIsUploading(false)
        return
      }

      // Save to Supabase documents table with both the original content and editor JSON
      const documentContent = {
        type: 'uploaded_file',
        original_content: content, // Store the original file content
        editor_content: editor.getJSON(), // Store the editor JSON for editing
        file_name: fileName
      }

      const { data, error } = await supabase
        .from('documents')
        .insert([
          {
            title: title.trim(),
            content: documentContent
          }
        ])
        .select()

      if (error) {
        throw error
      }

      const documentId = data[0].id

      // Create vector embeddings using the original file content (not the HTML)
      await embedDocument(content, documentId)

      // Extract knowledge graph
      console.log('Extracting knowledge graph...')
      const knowledgeResult = await extractKnowledgeGraph(content, documentId)
      if (knowledgeResult.success) {
        console.log(`Extracted ${knowledgeResult.count} knowledge triplets`)
      } else {
        console.warn('Knowledge extraction failed:', knowledgeResult.error)
      }

      // Show success message
      alert(`Document uploaded successfully! Created ${knowledgeResult.count || 0} knowledge triplets.`)
      console.log('Document uploaded successfully:', data)

      // Call optional callback
      if (onUpload) {
        onUpload(content, data[0])
      }

    } catch (error) {
      console.error('Error uploading document:', error)
      alert(`Error uploading document: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const processFile = async (file) => {
    // Check file type - only allow .txt and .md files
    const allowedTypes = ['.txt', '.md']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()

    if (!allowedTypes.includes(fileExtension)) {
      alert('Please upload a .txt or .md file')
      return
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB')
      return
    }

    setIsUploading(true)

    try {
      // Read text file content
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = () => reject(new Error('Error reading file'))

        reader.readAsText(file)
      })

      // Process the file content
      await handleFileRead(content, file.name)

    } catch (error) {
      console.error('Error processing file:', error)
      alert(`Error processing file: ${error.message}`)
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!isUploading ? openFileDialog : undefined}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Uploading and processing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <svg className="h-12 w-12 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload a document</h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your .txt or .md file here, or click to browse
            </p>
            <button
              type="button"
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Choose File
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Supports .txt and .md files up to 10MB
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileUpload
