-- Embeddings Table Setup for NeuraNotes
-- Run this AFTER creating the documents table
-- Run this in your Supabase SQL Editor

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  chunk TEXT NOT NULL,
  embedding vector(1536) NOT NULL, -- For text-embedding-3-large
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to documents table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_embeddings_document'
        AND table_name = 'embeddings'
    ) THEN
        ALTER TABLE embeddings
        ADD CONSTRAINT fk_embeddings_document
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at);

-- Create vector similarity index (commented out to avoid memory issues during setup)
-- Uncomment and run this after you have some embeddings data:
-- CREATE INDEX IF NOT EXISTS idx_embeddings_embedding ON embeddings 
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security (RLS)
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view embeddings" ON embeddings;
DROP POLICY IF EXISTS "Users can insert embeddings" ON embeddings;
DROP POLICY IF EXISTS "Users can update embeddings" ON embeddings;
DROP POLICY IF EXISTS "Users can delete embeddings" ON embeddings;

-- Create RLS policies for open access
CREATE POLICY "Users can view embeddings" ON embeddings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert embeddings" ON embeddings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update embeddings" ON embeddings
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete embeddings" ON embeddings
  FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON embeddings TO anon;
GRANT ALL ON embeddings TO authenticated;
GRANT ALL ON embeddings TO service_role;

-- Function for global vector similarity search
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    embeddings.id,
    embeddings.document_id,
    embeddings.chunk,
    1 - (embeddings.embedding <=> query_embedding) AS similarity
  FROM embeddings
  WHERE 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function for document-specific vector similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  target_document_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    embeddings.id,
    embeddings.document_id,
    embeddings.chunk,
    1 - (embeddings.embedding <=> query_embedding) AS similarity
  FROM embeddings
  WHERE
    embeddings.document_id = target_document_id
    AND 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to get embeddings for a document
CREATE OR REPLACE FUNCTION get_document_embeddings(target_document_id UUID)
RETURNS TABLE (
  id uuid,
  chunk text,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.chunk,
    e.created_at
  FROM embeddings e
  WHERE e.document_id = target_document_id
  ORDER BY e.created_at ASC;
$$;

-- Function to search embeddings by text content
CREATE OR REPLACE FUNCTION search_embeddings_by_text(
  search_term TEXT,
  target_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk text,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.document_id,
    e.chunk,
    e.created_at
  FROM embeddings e
  WHERE
    (target_document_id IS NULL OR e.document_id = target_document_id)
    AND e.chunk ILIKE '%' || search_term || '%'
  ORDER BY e.created_at DESC;
$$;

-- Function to get embedding statistics
CREATE OR REPLACE FUNCTION get_embedding_stats()
RETURNS TABLE (
  total_embeddings bigint,
  total_documents_with_embeddings bigint,
  avg_chunks_per_document float,
  avg_chunk_length float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) as total_embeddings,
    COUNT(DISTINCT document_id) as total_documents_with_embeddings,
    COUNT(*)::float / COUNT(DISTINCT document_id) as avg_chunks_per_document,
    AVG(LENGTH(chunk)) as avg_chunk_length
  FROM embeddings;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION match_chunks TO anon;
GRANT EXECUTE ON FUNCTION match_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_chunks TO service_role;

GRANT EXECUTE ON FUNCTION match_document_chunks TO anon;
GRANT EXECUTE ON FUNCTION match_document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_document_chunks TO service_role;

GRANT EXECUTE ON FUNCTION get_document_embeddings TO anon;
GRANT EXECUTE ON FUNCTION get_document_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_embeddings TO service_role;

GRANT EXECUTE ON FUNCTION search_embeddings_by_text TO anon;
GRANT EXECUTE ON FUNCTION search_embeddings_by_text TO authenticated;
GRANT EXECUTE ON FUNCTION search_embeddings_by_text TO service_role;

GRANT EXECUTE ON FUNCTION get_embedding_stats TO anon;
GRANT EXECUTE ON FUNCTION get_embedding_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_embedding_stats TO service_role;

-- Success message
SELECT 'Embeddings table setup completed successfully!' as message;
