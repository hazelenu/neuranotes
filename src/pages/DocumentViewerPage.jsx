import { useLocation, useNavigate } from 'react-router-dom'
import DocumentViewer from '../components/DocumentViewer'

const DocumentViewerPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const document = location.state?.document

  // If no document is provided, redirect to documents list
  if (!document) {
    navigate('/documents')
    return null
  }

  const handleBack = () => {
    navigate('/documents')
  }

  const handleEdit = () => {
    navigate('/editor', { state: { document } })
  }

  return (
    <DocumentViewer
      document={document}
      onBack={handleBack}
      onEdit={handleEdit}
    />
  )
}

export default DocumentViewerPage
