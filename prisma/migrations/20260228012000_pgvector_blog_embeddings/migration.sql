DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS "BlogEmbedding" (
      "id" TEXT PRIMARY KEY,
      "postId" TEXT NOT NULL UNIQUE REFERENCES "BlogPost"("id") ON DELETE CASCADE,
      "model" TEXT NOT NULL,
      "dimensions" INTEGER NOT NULL,
      "vector" vector(1536) NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "BlogEmbedding_vector_idx"
    ON "BlogEmbedding"
    USING ivfflat ("vector" vector_cosine_ops)
    WITH (lists = 100);
  ELSE
    RAISE NOTICE 'pgvector extension not available; skipping BlogEmbedding migration objects.';
  END IF;
END $$;
