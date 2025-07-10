-- Add is_default column to documents table
-- Run this in your Supabase SQL Editor

-- Add the is_default column
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries on default documents
CREATE INDEX IF NOT EXISTS idx_documents_is_default ON documents(is_default);

-- Success message
SELECT 'Added is_default column to documents table!' as message;
