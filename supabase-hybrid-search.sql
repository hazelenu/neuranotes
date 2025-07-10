-- Hybrid Search Setup for NeuraNotes
-- Combines Full Text Search (FTS) with Vector Similarity
-- Run this in your Supabase SQL Editor

-- Create Full Text Search index on chunk column
CREATE INDEX IF NOT EXISTS idx_embeddings_fts ON embeddings 
USING GIN (to_tsvector('english', chunk));

-- Hybrid search function that combines FTS and vector similarity
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(1536),
  query_text TEXT,
  match_count int DEFAULT 10,
  fts_weight float DEFAULT 0.5,
  vector_weight float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk text,
  fts_score float,
  vector_score float,
  hybrid_score float
)
LANGUAGE sql STABLE
AS $$
  WITH fts_results AS (
    SELECT 
      e.id,
      e.document_id,
      e.chunk,
      e.embedding,
      ts_rank(to_tsvector('english', e.chunk), plainto_tsquery('english', query_text)) as fts_rank
    FROM embeddings e
    WHERE to_tsvector('english', e.chunk) @@ plainto_tsquery('english', query_text)
  ),
  vector_results AS (
    SELECT 
      e.id,
      e.document_id,
      e.chunk,
      e.embedding,
      1 - (e.embedding <=> query_embedding) as vector_similarity
    FROM embeddings e
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count * 2  -- Get more candidates for better hybrid results
  ),
  combined_results AS (
    SELECT 
      COALESCE(f.id, v.id) as id,
      COALESCE(f.document_id, v.document_id) as document_id,
      COALESCE(f.chunk, v.chunk) as chunk,
      COALESCE(f.fts_rank, 0.0) as fts_score,
      COALESCE(v.vector_similarity, 0.0) as vector_score
    FROM fts_results f
    FULL OUTER JOIN vector_results v ON f.id = v.id
  )
  SELECT 
    cr.id,
    cr.document_id,
    cr.chunk,
    cr.fts_score,
    cr.vector_score,
    (fts_weight * cr.fts_score + vector_weight * cr.vector_score) as hybrid_score
  FROM combined_results cr
  WHERE cr.fts_score > 0 OR cr.vector_score > 0.7  -- Filter low-quality matches
  ORDER BY hybrid_score DESC
  LIMIT match_count;
$$;

-- Alternative simpler hybrid search function
CREATE OR REPLACE FUNCTION simple_hybrid_search(
  query_embedding vector(1536),
  query_text TEXT,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk text,
  hybrid_score float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    e.id,
    e.document_id,
    e.chunk,
    (
      0.5 * ts_rank(to_tsvector('english', e.chunk), plainto_tsquery('english', query_text)) +
      0.5 * (1 - (e.embedding <=> query_embedding))
    ) as hybrid_score
  FROM embeddings e
  WHERE 
    to_tsvector('english', e.chunk) @@ plainto_tsquery('english', query_text)
    OR (e.embedding <=> query_embedding) < 0.3  -- Vector similarity threshold
  ORDER BY hybrid_score DESC
  LIMIT match_count;
$$;

-- Function for document-specific hybrid search
CREATE OR REPLACE FUNCTION hybrid_search_document(
  query_embedding vector(1536),
  query_text TEXT,
  target_document_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  chunk text,
  hybrid_score float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    e.id,
    e.chunk,
    (
      0.5 * ts_rank(to_tsvector('english', e.chunk), plainto_tsquery('english', query_text)) +
      0.5 * (1 - (e.embedding <=> query_embedding))
    ) as hybrid_score
  FROM embeddings e
  WHERE 
    e.document_id = target_document_id
    AND (
      to_tsvector('english', e.chunk) @@ plainto_tsquery('english', query_text)
      OR (e.embedding <=> query_embedding) < 0.3
    )
  ORDER BY hybrid_score DESC
  LIMIT match_count;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION hybrid_search TO anon;
GRANT EXECUTE ON FUNCTION hybrid_search TO authenticated;
GRANT EXECUTE ON FUNCTION hybrid_search TO service_role;

GRANT EXECUTE ON FUNCTION simple_hybrid_search TO anon;
GRANT EXECUTE ON FUNCTION simple_hybrid_search TO authenticated;
GRANT EXECUTE ON FUNCTION simple_hybrid_search TO service_role;

GRANT EXECUTE ON FUNCTION hybrid_search_document TO anon;
GRANT EXECUTE ON FUNCTION hybrid_search_document TO authenticated;
GRANT EXECUTE ON FUNCTION hybrid_search_document TO service_role;

-- Success message
SELECT 'Hybrid search functions created successfully!' as message;
