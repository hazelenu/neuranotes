import { createContext, useContext, useState } from 'react'

const EditorContext = createContext()

export const useEditor = () => {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}

export const EditorProvider = ({ children }) => {
  const [editorInstance, setEditorInstance] = useState(null)
  const [currentDocument, setCurrentDocument] = useState(null)

  const value = {
    editorInstance,
    setEditorInstance,
    currentDocument,
    setCurrentDocument
  }

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}
