import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SelectionMenu } from '../extensions/SelectionMenu'
import { FileAttachment } from '../extensions/FileAttachment'
import SelectionCommandMenu from './SelectionCommandMenu'
import AskModal from './AskModal'
import DocumentSaveButton from './DocumentSaveButton'
import SaveStatus from './SaveStatus'
import FileUpload from './FileUpload'
import { useAutoSave } from '../hooks/useAutoSave'

export default function Editor({ selectedDocument, onShowDocuments }) {
  const navigate = useNavigate()
  const [showSelectionMenu, setShowSelectionMenu] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [showAskModal, setShowAskModal] = useState(false)
  const [askModalSelectedText, setAskModalSelectedText] = useState('')
  const [askModalRange, setAskModalRange] = useState(null)
  const [showFileUpload, setShowFileUpload] = useState(false)

  // Debug modal state changes
  useEffect(() => {
    console.log('Editor: showAskModal state changed to:', showAskModal)
  }, [showAskModal])

  // Debug selected text changes
  useEffect(() => {
    console.log('Editor: selectedText changed to:', selectedText)
  }, [selectedText])

  const handleRightClick = ({ hasSelection, selectedText: text, range, position }) => {
    console.log('Right-click on selection:', { hasSelection, text: text?.substring(0, 50), range, position })

    if (hasSelection && text && text.length > 5) {
      console.log('Showing context menu for:', text.substring(0, 50))
      setSelectedText(text)
      setSelectionRange(range)
      setMenuPosition(position)
      setShowSelectionMenu(true)
    }
  }

  // Hide menu when clicking elsewhere
  const handleClickOutside = () => {
    if (showSelectionMenu && !showAskModal) {
      setShowSelectionMenu(false)
      setSelectedText('')
      setSelectionRange(null)
    }
  }

  // Open ask modal with preserved selection
  const openAskModal = () => {
    console.log('openAskModal called with selectedText:', selectedText, 'range:', selectionRange)
    setAskModalSelectedText(selectedText)
    setAskModalRange(selectionRange)
    setShowAskModal(true)
    setShowSelectionMenu(false) // Close context menu
  }

  // Handle file upload completion
  const handleFileUpload = (content, document) => {
    console.log('File uploaded successfully:', document)
    setShowFileUpload(false)

    // Clear the editor content after successful upload
    if (editor) {
      editor.commands.clearContent()
    }

    // Optionally navigate to the new document or refresh the page
  }

  // Handle ask question submission
  const handleAskSubmit = async (question) => {
    console.log('Editor: handleAskSubmit called with question:', question)
    console.log('Using preserved askModalSelectedText:', askModalSelectedText)
    console.log('Using preserved askModalRange:', askModalRange)

    if (!askModalRange || !askModalSelectedText) {
      console.log('No preserved selection range or text available')
      return
    }

    // Step 1: Replace selected text with loading message
    editor
      .chain()
      .focus()
      .setTextSelection(askModalRange)
      .deleteSelection()
      .setColor('#87ceeb')
      .insertContent('Asking AI...')
      .setColor(null)
      .run()

    try {
      // Step 2: Send request to ask API
      console.log('Sending question to /api/ask:', { text: askModalSelectedText, question })

      let response, data

      try {
        response = await fetch('/api/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: askModalSelectedText, question }),
        })

        data = await response.json()
        console.log('API response:', data)
      } catch (fetchError) {
        // Fallback for local development
        console.log('API not available, using mock response for testing')
        await new Promise(resolve => setTimeout(resolve, 2000))

        response = { ok: true }
        data = {
          answer: `Based on the text "${askModalSelectedText.substring(0, 50)}${askModalSelectedText.length > 50 ? '...' : ''}", here's a mock answer to your question: "${question}". This would be a real AI response in production.`
        }
        console.log('Mock response:', data)
      }

      if (response.ok && data.answer) {
        // Step 3: Replace loading message with answer
        const doc = editor.state.doc
        let loadingPos = null

        doc.descendants((node, pos) => {
          if (node.isText && node.text.includes('Asking AI...')) {
            const startPos = pos + node.text.indexOf('Asking AI...')
            loadingPos = { from: startPos, to: startPos + 'Asking AI...'.length }
            return false
          }
        })

        if (loadingPos) {
          editor
            .chain()
            .focus()
            .setTextSelection(loadingPos)
            .deleteSelection()
            .setColor('#87ceeb')
            .insertContent(`${data.answer}`)
            .setColor(null)
            .run()
        } else {
          // Fallback: just insert at current position
          editor
            .chain()
            .focus()
            .setColor('#87ceeb')
            .insertContent(`${data.answer}`)
            .setColor(null)
            .run()
        }
      } else {
        // Handle error
        const errorMessage = data.error || 'Unknown error occurred'
        console.log('API error:', errorMessage)

        const doc = editor.state.doc
        let loadingPos = null

        doc.descendants((node, pos) => {
          if (node.isText && node.text.includes('Asking AI...')) {
            const startPos = pos + node.text.indexOf('Asking AI...')
            loadingPos = { from: startPos, to: startPos + 'Asking AI...'.length }
            return false
          }
        })

        if (loadingPos) {
          editor
            .chain()
            .focus()
            .setTextSelection(loadingPos)
            .deleteSelection()
            .insertContent(`Error: ${errorMessage}`)
            .run()
        }
      }
    } catch (error) {
      console.error('Ask error:', error)
      // Handle network error
      const doc = editor.state.doc
      let loadingPos = null

      doc.descendants((node, pos) => {
        if (node.isText && node.text.includes('Asking AI...')) {
          const startPos = pos + node.text.indexOf('Asking AI...')
          loadingPos = { from: startPos, to: startPos + 'Asking AI...'.length }
          return false
        }
      })

      if (loadingPos) {
        editor
          .chain()
          .focus()
          .setTextSelection(loadingPos)
          .deleteSelection()
          .insertContent('Error: Failed to connect to ask service')
          .run()
      }
    }
  }

  const editor = useEditor({
    onCreate: ({ editor }) => {
      console.log('Editor created with extensions:', editor.extensionManager.extensions.map(ext => ext.name))

      // Load selected document if provided
      if (selectedDocument && selectedDocument.content) {
        editor.commands.setContent(selectedDocument.content)
      }
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      FileAttachment,

      Placeholder.configure({
        placeholder: 'Start writing your thoughts... (Select text and right-click for AI options)',
        emptyEditorClass: 'is-editor-empty',
      }),
      SelectionMenu.configure({
        onRightClick: handleRightClick,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[250px]',
      },
    },
  })

  // Load selected document when it changes
  useEffect(() => {
    if (editor && selectedDocument && selectedDocument.content) {
      editor.commands.setContent(selectedDocument.content)
    }
  }, [editor, selectedDocument])

  // Auto-save functionality
  console.log('Editor - selectedDocument:', selectedDocument)
  console.log('Editor - selectedDocument?.id:', selectedDocument?.id)
  console.log('Editor - editor available:', !!editor)
  const { saveStatus } = useAutoSave(editor, selectedDocument?.id)
  console.log('Editor - saveStatus:', saveStatus)

  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run()
  }

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run()
  }

  const toggleStrike = () => {
    editor?.chain().focus().toggleStrike().run()
  }

  const toggleBulletList = () => {
    console.log('toggleBulletList clicked')
    console.log('editor available:', !!editor)
    console.log('bulletList command available:', !!editor?.commands?.toggleBulletList)
    editor?.chain().focus().toggleBulletList().run()
  }

  const toggleOrderedList = () => {
    console.log('toggleOrderedList clicked')
    console.log('editor available:', !!editor)
    console.log('orderedList command available:', !!editor?.commands?.toggleOrderedList)
    editor?.chain().focus().toggleOrderedList().run()
  }

  return (
    <>
      <div className="h-screen bg-gradient-to-br from-slate-700 via-gray-800 to-slate-700 flex flex-col p-4">
      {/* Top Navigation */}
      <div className="flex gap-6 mb-8">
        <button className="text-white/90 hover:text-white text-sm font-medium">
          Home
        </button>
        <button
          onClick={onShowDocuments}
          className="text-white/90 hover:text-white text-sm font-medium"
        >
          Documents
        </button>
        <button
          onClick={() => navigate('/ask')}
          className="text-sky-300 hover:text-sky-200 text-sm font-medium"
        >
          Ask AI
        </button>
        <button
          onClick={() => navigate('/knowledge')}
          className="text-emerald-300 hover:text-emerald-200 text-sm font-medium"
        >
          Knowledge Graph
        </button>
        <button
          onClick={() => navigate('/search')}
          className="text-yellow-300 hover:text-yellow-200 text-sm font-medium"
        >
          Search
        </button>
      </div>

      {/* Main Editor Container */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <h1 className="text-5xl">
              <span className="font-elegant italic font-medium text-white tracking-tight">Neura</span>
              <span className="font-display font-semibold text-sky-300 ml-1">Notes</span>
            </h1>
          </div>

        {/* Editor Box */}
        <div className="bg-white/20 backdrop-blur-md rounded-xl shadow-2xl border border-white/30">
          {/* Toolbar */}
          {editor && (
            <div className="border-b border-white/20 p-4 flex gap-3">
              <button
                onClick={toggleBold}
                className={`w-10 h-10 rounded-lg text-lg font-bold transition-all duration-200 flex items-center justify-center ${
                  editor.isActive('bold')
                    ? 'bg-purple-500/30 text-white border border-purple-400/50 shadow-lg'
                    : 'bg-white/10 text-white/90 hover:bg-white/20 border border-white/20'
                }`}
                title="Bold"
              >
                B
              </button>
              <button
                onClick={toggleItalic}
                className={`w-10 h-10 rounded-lg text-lg italic font-medium transition-all duration-200 flex items-center justify-center ${
                  editor.isActive('italic')
                    ? 'bg-purple-500/30 text-white border border-purple-400/50 shadow-lg'
                    : 'bg-white/10 text-white/90 hover:bg-white/20 border border-white/20'
                }`}
                title="Italic"
              >
                I
              </button>
              <button
                onClick={toggleStrike}
                className={`w-10 h-10 rounded-lg text-lg font-medium transition-all duration-200 flex items-center justify-center ${
                  editor.isActive('strike')
                    ? 'bg-purple-500/30 text-white border border-purple-400/50 shadow-lg'
                    : 'bg-white/10 text-white/90 hover:bg-white/20 border border-white/20'
                }`}
                title="Strikethrough"
              >
                <span className="line-through">S</span>
              </button>
              <button
                onClick={toggleBulletList}
                className={`w-10 h-10 rounded-lg text-lg font-medium transition-all duration-200 flex items-center justify-center ${
                  editor.isActive('bulletList')
                    ? 'bg-purple-500/30 text-white border border-purple-400/50 shadow-lg'
                    : 'bg-white/10 text-white/90 hover:bg-white/20 border border-white/20'
                }`}
                title="Bullet List"
              >
                •
              </button>
              <button
                onClick={toggleOrderedList}
                className={`w-10 h-10 rounded-lg text-lg font-medium transition-all duration-200 flex items-center justify-center ${
                  editor.isActive('orderedList')
                    ? 'bg-purple-500/30 text-white border border-purple-400/50 shadow-lg'
                    : 'bg-white/10 text-white/90 hover:bg-white/20 border border-white/20'
                }`}
                title="Numbered List"
              >
                1.
              </button>

              {/* Upload and Save Buttons */}
              <div className="ml-auto flex gap-3">
                <button
                  onClick={() => setShowFileUpload(true)}
                  className="bg-stone-200 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-300 transition-colors"
                >
                  Upload File
                </button>
                <DocumentSaveButton editor={editor} selectedDocument={selectedDocument} />
              </div>
            </div>
          )}
          {editor && (
            <div className="p-6 min-h-[350px] relative" onClick={handleClickOutside}>
              <EditorContent editor={editor} />

              {/* Selection Command Menu */}
              {showSelectionMenu && selectionRange && (
                <SelectionCommandMenu
                  editor={editor}
                  selectedText={selectedText}
                  range={selectionRange}
                  position={menuPosition}
                  onClose={() => setShowSelectionMenu(false)}
                  openAskModal={openAskModal}
                />
              )}
            </div>
          )}
        </div>
      </div>

        </div>

        {/* Copyright Footer */}
        <div className="mt-auto pt-8 pb-4">
          <div className="text-center text-white/40 text-xs">
            © 2025 NeuraNotes | Yiran (Hazel) Li, M.E.T @CMU School of Computer Science |
            <a href="tel:5108132075" className="hover:text-white/60 transition-colors ml-1">510-813-2075</a> |
            <a href="mailto:yiranli@andrew.cmu.edu" className="hover:text-white/60 transition-colors ml-1">yiranli@andrew.cmu.edu</a>
          </div>
        </div>
      </div>

      {/* Ask Modal - rendered at top level */}
      <AskModal
        isOpen={showAskModal}
        onClose={() => {
          console.log('Editor: Closing AskModal')
          setShowAskModal(false)
          // Clear selection data when modal closes
          setShowSelectionMenu(false)
          setSelectedText('')
          setSelectionRange(null)
        }}
        onSubmit={handleAskSubmit}
        selectedText={askModalSelectedText}
      />

      {/* Auto-save status indicator */}
      <SaveStatus status={saveStatus} />

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FileUpload
              editor={editor}
              onUpload={handleFileUpload}
            />
          </div>
        </div>
      )}


    </>
  )
}
