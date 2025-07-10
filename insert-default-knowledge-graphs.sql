-- Insert pre-generated knowledge graphs for default documents
-- Run this in your Supabase SQL Editor after inserting default documents

-- First, let's see what default documents we have
SELECT id, title FROM documents WHERE is_default = true ORDER BY created_at;

-- Insert knowledge graph for "The Turing Test: A Brief Introduction"
INSERT INTO knowledge_graph (document_id, subject, predicate, object)
SELECT 
  d.id,
  triplet.subject,
  triplet.predicate,
  triplet.object
FROM documents d,
(VALUES 
  ('Alan Turing', 'proposed', 'Turing Test'),
  ('Alan Turing', 'was', 'mathematician'),
  ('Alan Turing', 'was', 'computer scientist'),
  ('Turing Test', 'emerged from', 'Computing Machinery and Intelligence'),
  ('Computing Machinery and Intelligence', 'published in', '1950'),
  ('Turing Test', 'also known as', 'Imitation Game'),
  ('Turing Test', 'involves', 'human evaluator'),
  ('human evaluator', 'converses with', 'human and machine'),
  ('Turing Test', 'measures', 'intelligent behavior'),
  ('Turing Test', 'focuses on', 'observable behavior'),
  ('artificial intelligence', 'developed using', 'machine learning'),
  ('Turing Test', 'requires', 'natural language processing'),
  ('Turing Test', 'tests', 'conversational ability'),
  ('machine intelligence', 'demonstrated through', 'human-like responses'),
  ('AI researchers', 'develop', 'sophisticated systems'),
  ('Turing Test', 'remains', 'compelling benchmark'),
  ('1950s vision', 'continues to inspire', 'AI development'),
  ('Turing Test', 'serves as', 'philosophical touchstone')
) AS triplet(subject, predicate, object)
WHERE d.is_default = true AND d.title LIKE '%Turing Test%';

-- Insert knowledge graph for "Steve Jobs at Stanford (2005)"
INSERT INTO knowledge_graph (document_id, subject, predicate, object)
SELECT 
  d.id,
  triplet.subject,
  triplet.predicate,
  triplet.object
FROM documents d,
(VALUES 
  ('Steve Jobs', 'delivered speech at', 'Stanford University'),
  ('Stanford speech', 'occurred on', 'June 12, 2005'),
  ('Steve Jobs', 'shared', 'three stories'),
  ('first story', 'about', 'connecting the dots'),
  ('Steve Jobs', 'dropped out of', 'Reed College'),
  ('Steve Jobs', 'audited', 'calligraphy class'),
  ('calligraphy class', 'inspired', 'Apple typography'),
  ('connecting dots', 'requires', 'trust in future'),
  ('second story', 'about', 'love and loss'),
  ('Steve Jobs', 'was fired from', 'Apple'),
  ('Steve Jobs', 'co-founded', 'Apple'),
  ('being fired', 'led to', 'creative period'),
  ('Steve Jobs', 'founded', 'NeXT'),
  ('Steve Jobs', 'founded', 'Pixar'),
  ('Steve Jobs', 'returned to', 'Apple'),
  ('third story', 'about', 'death'),
  ('Steve Jobs', 'diagnosed with', 'cancer'),
  ('facing mortality', 'clarified', 'priorities'),
  ('death awareness', 'leads to', 'authentic living'),
  ('Steve Jobs', 'advised', 'Stay hungry, Stay foolish'),
  ('Stay hungry, Stay foolish', 'borrowed from', 'Whole Earth Catalog'),
  ('speech', 'emphasized', 'intuition'),
  ('speech', 'emphasized', 'risk-taking'),
  ('success', 'emerges from', 'apparent setbacks'),
  ('creativity', 'flourishes in', 'uncertainty')
) AS triplet(subject, predicate, object)
WHERE d.is_default = true AND d.title LIKE '%Steve Jobs%';

-- Insert knowledge graph for "Getting Started with NeuraNotes"
INSERT INTO knowledge_graph (document_id, subject, predicate, object)
SELECT 
  d.id,
  triplet.subject,
  triplet.predicate,
  triplet.object
FROM documents d,
(VALUES 
  ('NeuraNotes', 'is', 'AI-enhanced note-taking platform'),
  ('NeuraNotes', 'supports', 'PDF files'),
  ('NeuraNotes', 'supports', 'TXT files'),
  ('NeuraNotes', 'supports', 'Markdown files'),
  ('uploaded documents', 'become part of', 'personal knowledge base'),
  ('slash commands', 'accessed by typing', '/'),
  ('/summarize', 'provides', 'intelligent summaries'),
  ('/ask', 'enables', 'document querying'),
  ('document querying', 'uses', 'retrieval-augmented generation'),
  ('RAG', 'stands for', 'retrieval-augmented generation'),
  ('knowledge graph', 'extracts', 'relationships'),
  ('knowledge graph', 'extracts', 'entities'),
  ('knowledge graph', 'extracts', 'concepts'),
  ('knowledge graph', 'visualizes', 'idea connections'),
  ('knowledge graph', 'helps discover', 'hidden patterns'),
  ('hybrid search', 'combines', 'keyword search'),
  ('hybrid search', 'combines', 'semantic similarity'),
  ('semantic search', 'understands', 'context and meaning'),
  ('NeuraNotes', 'processes documents for', 'search'),
  ('NeuraNotes', 'creates', 'knowledge graphs'),
  ('NeuraNotes', 'enables', 'AI-powered questioning'),
  ('personal AI assistant', 'becomes more powerful with', 'more content'),
  ('knowledge base', 'enriched by', 'each document'),
  ('AI responses', 'become more', 'insightful'),
  ('NeuraNotes', 'represents', 'future of intelligent note-taking')
) AS triplet(subject, predicate, object)
WHERE d.is_default = true AND d.title LIKE '%Getting Started%';

-- Verify the insertion
SELECT 
  d.title,
  COUNT(kg.id) as triplet_count
FROM documents d
LEFT JOIN knowledge_graph kg ON d.id = kg.document_id
WHERE d.is_default = true
GROUP BY d.id, d.title
ORDER BY d.created_at;

-- Get overall statistics
SELECT 
  COUNT(DISTINCT kg.document_id) as documents_with_kg,
  COUNT(kg.id) as total_triplets,
  COUNT(DISTINCT kg.subject) + COUNT(DISTINCT kg.object) as unique_entities
FROM knowledge_graph kg
JOIN documents d ON kg.document_id = d.id
WHERE d.is_default = true;

-- Success message
SELECT 'Default knowledge graphs inserted successfully!' as message;
