import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getDocumentKnowledgeGraph, searchKnowledgeGraph } from '../lib/knowledgeGraph'
import KnowledgeGraphVisualization from '../components/KnowledgeGraphVisualization'

const KnowledgeGraphPage = () => {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [knowledgeData, setKnowledgeData] = useState({ nodes: [], links: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('document') // 'document' or 'global'
  const [stats, setStats] = useState({ totalTriplets: 0, uniqueEntities: 0, documents: 0 })

  // Load documents on component mount
  useEffect(() => {
    loadDocuments()
    loadGlobalStats()
  }, [])

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error('Error loading documents:', err)
    }
  }

  const loadGlobalStats = async () => {
    try {
      // Get total triplets
      const { count: totalTriplets, error: countError } = await supabase
        .from('knowledge_graph')
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError

      // Get unique entities (subjects + objects) and document IDs
      const { data: allTriplets, error: tripletsError } = await supabase
        .from('knowledge_graph')
        .select('subject, object, document_id')

      if (tripletsError) throw tripletsError

      const entities = new Set()
      const documentIds = new Set()

      allTriplets?.forEach(triplet => {
        entities.add(triplet.subject)
        entities.add(triplet.object)
        documentIds.add(triplet.document_id)
      })

      setStats({
        totalTriplets: totalTriplets || 0,
        uniqueEntities: entities.size,
        documents: documentIds.size
      })
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const handleDocumentSelect = async (doc) => {
    setSelectedDocument(doc)
    setIsLoading(true)
    
    try {
      const result = await getDocumentKnowledgeGraph(doc.id)
      if (result.success) {
        const graphData = convertTripletsToGraph(result.triplets)
        setKnowledgeData(graphData)
      }
    } catch (err) {
      console.error('Error loading knowledge graph:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGlobalView = async () => {
    setViewMode('global')
    setSelectedDocument(null)
    setIsLoading(true)
    
    try {
      const { data: allTriplets, error } = await supabase
        .from('knowledge_graph')
        .select('subject, predicate, object, document_id')
        .limit(100) // Limit for performance

      if (error) throw error

      const graphData = convertTripletsToGraph(allTriplets || [])
      setKnowledgeData(graphData)
    } catch (err) {
      console.error('Error loading global knowledge graph:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setIsLoading(true)
    try {
      const result = await searchKnowledgeGraph(searchTerm, selectedDocument?.id)
      if (result.success) {
        const graphData = convertTripletsToGraph(result.results)
        setKnowledgeData(graphData)
      }
    } catch (err) {
      console.error('Error searching knowledge graph:', err)
    } finally {
      setIsLoading(false)
    }
  }



  const convertTripletsToGraph = (triplets) => {
    const nodes = new Map()
    const links = []

    triplets.forEach(triplet => {
      // Add subject node
      if (!nodes.has(triplet.subject)) {
        nodes.set(triplet.subject, {
          id: triplet.subject,
          label: triplet.subject,
          type: 'entity',
          connections: 0
        })
      }

      // Add object node
      if (!nodes.has(triplet.object)) {
        nodes.set(triplet.object, {
          id: triplet.object,
          label: triplet.object,
          type: 'entity',
          connections: 0
        })
      }

      // Add link
      links.push({
        source: triplet.subject,
        target: triplet.object,
        label: triplet.predicate,
        type: 'relationship'
      })

      // Update connection counts
      nodes.get(triplet.subject).connections++
      nodes.get(triplet.object).connections++
    })

    return {
      nodes: Array.from(nodes.values()),
      links: links
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-700 via-gray-800 to-slate-700 flex flex-col">
      {/* Header */}
      <div className="bg-white/10 border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/editor')}
              className="text-white/90 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-white">
              <span className="italic text-white">Knowledge</span>
              <span className="text-emerald-300 ml-1">Graph</span>
            </h1>
          </div>
          
          {/* Stats */}
          <div className="flex gap-6 text-sm text-white/80">
            <div className="text-center">
              <div className="font-semibold text-white">{stats.totalTriplets}</div>
              <div>Triplets</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-white">{stats.uniqueEntities}</div>
              <div>Entities</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-white">{stats.documents}</div>
              <div>Documents</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white/5 border-r border-white/20 p-4 overflow-y-auto">
          {/* View Mode Toggle */}
          <div className="mb-4">
            <div className="flex bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('document')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'document'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Document
              </button>
              <button
                onClick={handleGlobalView}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'global'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Global
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search entities..."
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="bg-emerald-500/30 text-white border border-emerald-400/50 px-3 py-2 rounded-lg hover:bg-emerald-500/50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Document List */}
          {viewMode === 'document' && (
            <div>
              <h2 className="text-lg font-medium text-white mb-4">Documents</h2>
              
              {documents.length === 0 ? (
                <div className="text-white/70 text-center py-8">
                  <p>No documents found.</p>
                  <button
                    onClick={() => navigate('/editor')}
                    className="text-emerald-300 hover:text-emerald-200 mt-2"
                  >
                    Upload a document first
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleDocumentSelect(doc)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedDocument?.id === doc.id
                          ? 'bg-emerald-500/30 border border-emerald-400/50'
                          : 'bg-white/10 border border-white/20 hover:bg-white/20'
                      }`}
                    >
                      <div className={`font-medium ${
                        selectedDocument?.id === doc.id
                          ? 'text-white'
                          : 'text-emerald-300'
                      }`}>
                        {doc.title}
                      </div>
                      <div className="text-sm text-white/60">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Global View Info */}
          {viewMode === 'global' && (
            <div className="text-white/70">
              <h2 className="text-lg font-medium text-white mb-4">Global Knowledge Graph</h2>
              <p className="text-sm mb-4">
                Showing knowledge from all documents. Use search to filter by specific entities or relationships.
              </p>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Total Triplets:</span>
                    <span className="text-white">{stats.totalTriplets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Entities:</span>
                    <span className="text-white">{stats.uniqueEntities}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Visualization Area */}
        <div className="flex-1 flex flex-col">
          {/* Visualization Header */}
          <div className="bg-white/5 border-b border-white/20 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">
                {viewMode === 'global'
                  ? 'Global Knowledge Graph'
                  : selectedDocument
                    ? `Knowledge Graph: ${selectedDocument.title}`
                    : 'Select a document to view its knowledge graph'
                }
              </h2>

              {knowledgeData.nodes.length > 0 && (
                <div className="text-sm text-white/70">
                  {knowledgeData.nodes.length} entities • {knowledgeData.links.length} relationships
                </div>
              )}
            </div>
          </div>

          {/* Visualization */}
          <div className="flex-1 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-white/70">
                  <svg className="animate-spin h-8 w-8 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p>Loading knowledge graph...</p>
                </div>
              </div>
            ) : knowledgeData.nodes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white/70">
                  <svg className="h-16 w-16 mx-auto mb-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">No Knowledge Graph Data</h3>
                  <p className="mb-4">
                    {viewMode === 'global' 
                      ? 'No knowledge triplets found across all documents.'
                      : selectedDocument 
                        ? 'This document has no knowledge triplets yet.'
                        : 'Select a document to view its knowledge graph.'
                    }
                  </p>
                  {!selectedDocument && viewMode === 'document' && (
                    <button
                      onClick={() => navigate('/editor')}
                      className="text-emerald-300 hover:text-emerald-200"
                    >
                      Upload a document to get started
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <KnowledgeGraphVisualization data={knowledgeData} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeGraphPage
