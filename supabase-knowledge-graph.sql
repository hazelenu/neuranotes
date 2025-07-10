-- Create knowledge_graph table for storing extracted triplets
CREATE TABLE IF NOT EXISTS knowledge_graph (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  source_snippet TEXT, -- Original paragraph text where triplet was extracted
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add source_snippet column if it doesn't exist (for existing tables)
ALTER TABLE knowledge_graph ADD COLUMN IF NOT EXISTS source_snippet TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_document_id ON knowledge_graph(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_subject ON knowledge_graph(subject);
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_predicate ON knowledge_graph(predicate);
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_object ON knowledge_graph(object);
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_created_at ON knowledge_graph(created_at);

-- Create a composite index for subject-predicate-object uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_graph_unique_triplet 
ON knowledge_graph(document_id, subject, predicate, object);

-- Enable Row Level Security (RLS)
ALTER TABLE knowledge_graph ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view knowledge graph entries" ON knowledge_graph;
DROP POLICY IF EXISTS "Users can insert knowledge graph entries" ON knowledge_graph;
DROP POLICY IF EXISTS "Users can update their knowledge graph entries" ON knowledge_graph;
DROP POLICY IF EXISTS "Users can delete their knowledge graph entries" ON knowledge_graph;

-- Create RLS policies
CREATE POLICY "Users can view knowledge graph entries" ON knowledge_graph
  FOR SELECT USING (true);

CREATE POLICY "Users can insert knowledge graph entries" ON knowledge_graph
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their knowledge graph entries" ON knowledge_graph
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their knowledge graph entries" ON knowledge_graph
  FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON knowledge_graph TO anon;
GRANT ALL ON knowledge_graph TO authenticated;
GRANT ALL ON knowledge_graph TO service_role;

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS get_document_knowledge_graph(UUID);

-- Create a function to get knowledge graph for a document
CREATE OR REPLACE FUNCTION get_document_knowledge_graph(target_document_id UUID)
RETURNS TABLE (
  id UUID,
  subject TEXT,
  predicate TEXT,
  object TEXT,
  source_snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kg.id,
    kg.subject,
    kg.predicate,
    kg.object,
    kg.source_snippet,
    kg.created_at
  FROM knowledge_graph kg
  WHERE kg.document_id = target_document_id
  ORDER BY kg.created_at DESC;
$$;

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS search_knowledge_graph(TEXT, UUID);

-- Create a function to search knowledge graph by entity
CREATE OR REPLACE FUNCTION search_knowledge_graph(
  search_term TEXT,
  target_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  subject TEXT,
  predicate TEXT,
  object TEXT,
  source_snippet TEXT,
  document_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kg.id,
    kg.subject,
    kg.predicate,
    kg.object,
    kg.source_snippet,
    kg.document_id,
    kg.created_at
  FROM knowledge_graph kg
  WHERE
    (target_document_id IS NULL OR kg.document_id = target_document_id)
    AND (
      kg.subject ILIKE '%' || search_term || '%' OR
      kg.predicate ILIKE '%' || search_term || '%' OR
      kg.object ILIKE '%' || search_term || '%'
    )
  ORDER BY kg.created_at DESC;
$$;

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS get_related_entities(TEXT, UUID);

-- Create a function to get related entities
CREATE OR REPLACE FUNCTION get_related_entities(entity_name TEXT, target_document_id UUID DEFAULT NULL)
RETURNS TABLE (
  related_entity TEXT,
  relationship TEXT,
  relationship_type TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT
    CASE 
      WHEN kg.subject ILIKE '%' || entity_name || '%' THEN kg.object
      WHEN kg.object ILIKE '%' || entity_name || '%' THEN kg.subject
    END as related_entity,
    kg.predicate as relationship,
    CASE 
      WHEN kg.subject ILIKE '%' || entity_name || '%' THEN 'outgoing'
      WHEN kg.object ILIKE '%' || entity_name || '%' THEN 'incoming'
    END as relationship_type
  FROM knowledge_graph kg
  WHERE 
    (target_document_id IS NULL OR kg.document_id = target_document_id)
    AND (
      kg.subject ILIKE '%' || entity_name || '%' OR
      kg.object ILIKE '%' || entity_name || '%'
    )
  ORDER BY related_entity;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_document_knowledge_graph TO anon;
GRANT EXECUTE ON FUNCTION get_document_knowledge_graph TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_knowledge_graph TO service_role;

GRANT EXECUTE ON FUNCTION search_knowledge_graph TO anon;
GRANT EXECUTE ON FUNCTION search_knowledge_graph TO authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_graph TO service_role;

GRANT EXECUTE ON FUNCTION get_related_entities TO anon;
GRANT EXECUTE ON FUNCTION get_related_entities TO authenticated;
GRANT EXECUTE ON FUNCTION get_related_entities TO service_role;
