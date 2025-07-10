-- Documents Table Setup for NeuraNotes
-- Run this in your Supabase SQL Editor

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view documents" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can update documents" ON documents;
DROP POLICY IF EXISTS "Users can delete documents" ON documents;

-- Create RLS policies for open access
CREATE POLICY "Users can view documents" ON documents
  FOR SELECT USING (true);

CREATE POLICY "Users can insert documents" ON documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update documents" ON documents
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete documents" ON documents
  FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON documents TO anon;
GRANT ALL ON documents TO authenticated;
GRANT ALL ON documents TO service_role;

-- Function to get document by ID
CREATE OR REPLACE FUNCTION get_document(target_document_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    d.id,
    d.title,
    d.content,
    d.created_at,
    d.updated_at
  FROM documents d
  WHERE d.id = target_document_id;
$$;

-- Function to search documents by title
CREATE OR REPLACE FUNCTION search_documents(search_term TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    d.id,
    d.title,
    d.content,
    d.created_at,
    d.updated_at
  FROM documents d
  WHERE d.title ILIKE '%' || search_term || '%'
  ORDER BY d.updated_at DESC;
$$;

-- Function to get recent documents
CREATE OR REPLACE FUNCTION get_recent_documents(limit_count int DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    d.id,
    d.title,
    d.content,
    d.created_at,
    d.updated_at
  FROM documents d
  ORDER BY d.updated_at DESC
  LIMIT limit_count;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_document TO anon;
GRANT EXECUTE ON FUNCTION get_document TO authenticated;
GRANT EXECUTE ON FUNCTION get_document TO service_role;

GRANT EXECUTE ON FUNCTION search_documents TO anon;
GRANT EXECUTE ON FUNCTION search_documents TO authenticated;
GRANT EXECUTE ON FUNCTION search_documents TO service_role;

GRANT EXECUTE ON FUNCTION get_recent_documents TO anon;
GRANT EXECUTE ON FUNCTION get_recent_documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_documents TO service_role;

-- Success message
SELECT 'Documents table setup completed successfully!' as message;
