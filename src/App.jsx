import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import EditorPage from './pages/EditorPage'
import DocumentsPage from './pages/DocumentsPage'
import DocumentViewerPage from './pages/DocumentViewerPage'
import RAGPage from './pages/RAGPage'
import KnowledgeGraphPage from './pages/KnowledgeGraphPage'
import SearchPage from './pages/SearchPage'
import { initializeDefaultDocuments } from './utils/initializeDefaultDocuments'

function App() {
  // Initialize default documents when app starts
  useEffect(() => {
    const setupDefaultDocuments = async () => {
      try {
        await initializeDefaultDocuments()
      } catch (error) {
        console.error('Failed to initialize default documents:', error)
      }
    }

    setupDefaultDocuments()
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/editor" replace />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/view/:id" element={<DocumentViewerPage />} />
        <Route path="/ask" element={<RAGPage />} />
        <Route path="/knowledge" element={<KnowledgeGraphPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </Router>
  )
}

export default App
