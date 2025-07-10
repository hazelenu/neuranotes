import { useLocation, useNavigate } from 'react-router-dom'
import Editor from '../components/Editor'

export default function EditorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedDocument = location.state?.document

  const handleShowDocuments = () => {
    navigate('/documents')
  }

  return (
    <Editor
      selectedDocument={selectedDocument}
      onShowDocuments={handleShowDocuments}
    />
  )
}
