// Pre-generated knowledge graphs for default documents
// These will be inserted along with the default documents

export const defaultKnowledgeGraphs = {
  // Knowledge graph for "The Turing Test: A Brief Introduction"
  turingTest: [
    { subject: "Alan Turing", predicate: "proposed", object: "Turing Test" },
    { subject: "Alan Turing", predicate: "was", object: "mathematician" },
    { subject: "Alan Turing", predicate: "was", object: "computer scientist" },
    { subject: "Turing Test", predicate: "emerged from", object: "Computing Machinery and Intelligence" },
    { subject: "Computing Machinery and Intelligence", predicate: "published in", object: "1950" },
    { subject: "Turing Test", predicate: "also known as", object: "Imitation Game" },
    { subject: "Turing Test", predicate: "involves", object: "human evaluator" },
    { subject: "human evaluator", predicate: "converses with", object: "human and machine" },
    { subject: "Turing Test", predicate: "measures", object: "intelligent behavior" },
    { subject: "Turing Test", predicate: "focuses on", object: "observable behavior" },
    { subject: "artificial intelligence", predicate: "developed using", object: "machine learning" },
    { subject: "Turing Test", predicate: "requires", object: "natural language processing" },
    { subject: "Turing Test", predicate: "tests", object: "conversational ability" },
    { subject: "machine intelligence", predicate: "demonstrated through", object: "human-like responses" },
    { subject: "AI researchers", predicate: "develop", object: "sophisticated systems" },
    { subject: "Turing Test", predicate: "remains", object: "compelling benchmark" },
    { subject: "1950s vision", predicate: "continues to inspire", object: "AI development" },
    { subject: "Turing Test", predicate: "serves as", object: "philosophical touchstone" }
  ],

  // Knowledge graph for "Steve Jobs at Stanford (2005)"
  steveJobs: [
    { subject: "Steve Jobs", predicate: "delivered speech at", object: "Stanford University" },
    { subject: "Stanford speech", predicate: "occurred on", object: "June 12, 2005" },
    { subject: "Steve Jobs", predicate: "shared", object: "three stories" },
    { subject: "first story", predicate: "about", object: "connecting the dots" },
    { subject: "Steve Jobs", predicate: "dropped out of", object: "Reed College" },
    { subject: "Steve Jobs", predicate: "audited", object: "calligraphy class" },
    { subject: "calligraphy class", predicate: "inspired", object: "Apple typography" },
    { subject: "connecting dots", predicate: "requires", object: "trust in future" },
    { subject: "second story", predicate: "about", object: "love and loss" },
    { subject: "Steve Jobs", predicate: "was fired from", object: "Apple" },
    { subject: "Steve Jobs", predicate: "co-founded", object: "Apple" },
    { subject: "being fired", predicate: "led to", object: "creative period" },
    { subject: "Steve Jobs", predicate: "founded", object: "NeXT" },
    { subject: "Steve Jobs", predicate: "founded", object: "Pixar" },
    { subject: "Steve Jobs", predicate: "returned to", object: "Apple" },
    { subject: "third story", predicate: "about", object: "death" },
    { subject: "Steve Jobs", predicate: "diagnosed with", object: "cancer" },
    { subject: "facing mortality", predicate: "clarified", object: "priorities" },
    { subject: "death awareness", predicate: "leads to", object: "authentic living" },
    { subject: "Steve Jobs", predicate: "advised", object: "Stay hungry, Stay foolish" },
    { subject: "Stay hungry, Stay foolish", predicate: "borrowed from", object: "Whole Earth Catalog" },
    { subject: "speech", predicate: "emphasized", object: "intuition" },
    { subject: "speech", predicate: "emphasized", object: "risk-taking" },
    { subject: "success", predicate: "emerges from", object: "apparent setbacks" },
    { subject: "creativity", predicate: "flourishes in", object: "uncertainty" }
  ],

  // Knowledge graph for "Getting Started with NeuraNotes"
  neuraNotes: [
    { subject: "NeuraNotes", predicate: "is", object: "AI-enhanced note-taking platform" },
    { subject: "NeuraNotes", predicate: "supports", object: "PDF files" },
    { subject: "NeuraNotes", predicate: "supports", object: "TXT files" },
    { subject: "NeuraNotes", predicate: "supports", object: "Markdown files" },
    { subject: "uploaded documents", predicate: "become part of", object: "personal knowledge base" },
    { subject: "slash commands", predicate: "accessed by typing", object: "/" },
    { subject: "/summarize", predicate: "provides", object: "intelligent summaries" },
    { subject: "/ask", predicate: "enables", object: "document querying" },
    { subject: "document querying", predicate: "uses", object: "retrieval-augmented generation" },
    { subject: "RAG", predicate: "stands for", object: "retrieval-augmented generation" },
    { subject: "knowledge graph", predicate: "extracts", object: "relationships" },
    { subject: "knowledge graph", predicate: "extracts", object: "entities" },
    { subject: "knowledge graph", predicate: "extracts", object: "concepts" },
    { subject: "knowledge graph", predicate: "visualizes", object: "idea connections" },
    { subject: "knowledge graph", predicate: "helps discover", object: "hidden patterns" },
    { subject: "hybrid search", predicate: "combines", object: "keyword search" },
    { subject: "hybrid search", predicate: "combines", object: "semantic similarity" },
    { subject: "semantic search", predicate: "understands", object: "context and meaning" },
    { subject: "NeuraNotes", predicate: "processes documents for", object: "search" },
    { subject: "NeuraNotes", predicate: "creates", object: "knowledge graphs" },
    { subject: "NeuraNotes", predicate: "enables", object: "AI-powered questioning" },
    { subject: "personal AI assistant", predicate: "becomes more powerful with", object: "more content" },
    { subject: "knowledge base", predicate: "enriched by", object: "each document" },
    { subject: "AI responses", predicate: "become more", object: "insightful" },
    { subject: "NeuraNotes", predicate: "represents", object: "future of intelligent note-taking" }
  ]
}

// Function to get knowledge graph data for a document by title
export const getKnowledgeGraphByTitle = (title) => {
  if (title.includes("Turing Test")) {
    return defaultKnowledgeGraphs.turingTest
  } else if (title.includes("Steve Jobs")) {
    return defaultKnowledgeGraphs.steveJobs
  } else if (title.includes("Getting Started")) {
    return defaultKnowledgeGraphs.neuraNotes
  }
  return []
}
