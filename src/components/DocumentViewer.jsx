import { useNavigate } from 'react-router-dom'

const DocumentViewer = ({ document, onBack, onEdit }) => {
  const navigate = useNavigate()

  const handleEdit = () => {
    // Navigate to editor with document data
    navigate('/editor', { state: { document } })
  }

  const handleHome = () => {
    navigate('/editor')
  }

  const handleDocuments = () => {
    navigate('/documents')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderContent = (content) => {
    console.log('DocumentViewer: Rendering content:', content)

    // Handle different content types
    if (!content) {
      return <div className="text-white/60">No content available</div>
    }

    // Handle uploaded file content (new structure)
    if (typeof content === 'object' && content.type === 'uploaded_file') {
      return (
        <div className="text-white/90 whitespace-pre-wrap leading-relaxed font-mono text-sm">
          {content.original_content || 'No file content available'}
        </div>
      )
    }

    // If content is a string (plain text)
    if (typeof content === 'string') {
      return (
        <div className="text-white/90 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      )
    }

    // If content is a Tiptap JSON structure (type: 'doc')
    if (typeof content === 'object' && content.type === 'doc' && content.content) {
      return renderTiptapContent(content)
    }

    // If content has a content array (Tiptap structure)
    if (typeof content === 'object' && content.content && Array.isArray(content.content)) {
      return renderTiptapContent(content)
    }

    // Fallback: try to display as formatted JSON or string
    return (
      <div className="text-white/90 whitespace-pre-wrap leading-relaxed">
        <div className="text-white/60 text-sm mb-2">Debug: Content structure</div>
        <pre className="text-xs bg-black/20 p-2 rounded">
          {typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content)}
        </pre>
      </div>
    )
  }

  const renderTiptapContent = (content) => {
    const renderNode = (node) => {
      switch (node.type) {
        case 'paragraph':
          return (
            <p className="mb-4 text-white/90 leading-relaxed">
              {node.content ? node.content.map((child, index) => renderNode(child)) : ''}
            </p>
          )
        case 'text':
          let text = node.text || ''
          if (node.marks) {
            node.marks.forEach(mark => {
              switch (mark.type) {
                case 'bold':
                  text = <strong key={`bold-${Math.random()}`}>{text}</strong>
                  break
                case 'italic':
                  text = <em key={`italic-${Math.random()}`}>{text}</em>
                  break
                case 'strike':
                  text = <s key={`strike-${Math.random()}`}>{text}</s>
                  break
                case 'textStyle':
                  if (mark.attrs && mark.attrs.color) {
                    text = <span key={`color-${Math.random()}`} style={{ color: mark.attrs.color }}>{text}</span>
                  }
                  break
              }
            })
          }
          return text
        case 'bulletList':
          return (
            <ul className="list-disc list-inside mb-4 text-white/90 space-y-2">
              {node.content ? node.content.map((child, index) => (
                <li key={index}>{renderNode(child)}</li>
              )) : ''}
            </ul>
          )
        case 'orderedList':
          return (
            <ol className="list-decimal list-inside mb-4 text-white/90 space-y-2">
              {node.content ? node.content.map((child, index) => (
                <li key={index}>{renderNode(child)}</li>
              )) : ''}
            </ol>
          )
        case 'listItem':
          return node.content ? node.content.map((child, index) => renderNode(child)) : ''
        case 'heading':
          const HeadingTag = `h${node.attrs?.level || 1}`
          const headingClasses = {
            1: 'text-3xl font-bold mb-4 text-white',
            2: 'text-2xl font-semibold mb-3 text-white',
            3: 'text-xl font-medium mb-2 text-white'
          }
          return (
            <HeadingTag className={headingClasses[node.attrs?.level || 1]}>
              {node.content ? node.content.map((child, index) => renderNode(child)) : ''}
            </HeadingTag>
          )
        default:
          return node.content ? node.content.map((child, index) => renderNode(child)) : ''
      }
    }

    return (
      <div className="prose prose-invert max-w-none">
        {content.content.map((node, index) => (
          <div key={index}>{renderNode(node)}</div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Top Navigation */}
        <div className="flex gap-6 mb-8">
          <button
            onClick={handleHome}
            className="text-white/90 hover:text-white text-sm font-medium"
          >
            Home
          </button>
          <button
            onClick={handleDocuments}
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

        {/* Document Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-white">{document.title}</h1>
            <div className="flex gap-3">
              <button
                onClick={handleEdit}
                className="bg-blue-500/30 text-white border border-blue-400/50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={onBack}
                className="bg-white/10 text-white/90 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Back to Documents
              </button>
            </div>
          </div>
          <p className="text-white/50 text-sm">
            Last updated: {formatDate(document.updated_at)}
          </p>
        </div>

        {/* Document Content with Scrolling */}
        <div className="bg-white/10 border border-white/20 rounded-lg overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto p-6 custom-scrollbar">
            {renderContent(document.content)}
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  )
}

export default DocumentViewer
