-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_document_chunks;

-- Create function for document-specific chunk matching
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

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION match_document_chunks TO anon;
GRANT EXECUTE ON FUNCTION match_document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_document_chunks TO service_role;
