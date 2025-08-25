-- Create the corrected similarity search function
CREATE OR REPLACE FUNCTION match_documents (
    filter jsonb DEFAULT '{}'::jsonb,
    match_count int DEFAULT 5,
    query_embedding vector(1536) DEFAULT '[0]'::vector
) RETURNS TABLE (
    id uuid,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate that query_embedding is not the default zero vector
    IF query_embedding = '[0]'::vector THEN
        RAISE EXCEPTION 'A valid query embedding must be provided';
    END IF;

    RETURN QUERY
    SELECT 
        n8n_documents.id, 
        n8n_documents.content,
        n8n_documents.metadata,
        (n8n_documents.embedding <=> query_embedding) AS similarity
    FROM 
        n8n_documents
    WHERE 
        -- Apply optional filtering based on metadata
        (filter = '{}'::jsonb OR n8n_documents.metadata @> filter)
        AND 
        -- Similarity threshold
        (n8n_documents.embedding <=> query_embedding) < 0.75
    ORDER BY 
        similarity
    LIMIT match_count;
END;
$$;

-- Add a comment to explain function usage
COMMENT ON FUNCTION match_documents IS 
'Performs semantic similarity search on n8n_documents with optional metadata filtering.

Parameters:
- filter: JSONB object to filter documents by metadata (default: empty object)
- match_count: Number of results to return (default 5)
- query_embedding: Vector embedding to compare against (default: throws error if not provided)

Example usages:
1. Basic search: 
   SELECT * FROM match_documents(
     ''{}''::jsonb, 
     5, 
     ''[0.1, 0.2, ...]''::vector
   )

2. Filtered search:
   SELECT * FROM match_documents(
     ''{"source": "website", "category": "tech"}''::jsonb, 
     5, 
     ''[0.1, 0.2, ...]''::vector
   )
';

create or replace function set_title_from_metadata()
returns trigger as $$
begin
  new.title := new.metadata->>'title';
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_title on public.n8n_documents;

create trigger trg_set_title
before insert or update on public.n8n_documents
for each row
execute function set_title_from_metadata();
