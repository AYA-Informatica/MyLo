-- Drops article_chunks, which nothing has ever read.
--
-- It was designed for a retrieval architecture this project measured and then
-- did not build: pre-chunked article text with stored embeddings, queried by
-- vector similarity. The index is built in memory from `article_texts` instead,
-- and dense retrieval was rejected because an embedding model must be resident
-- when the question is asked — a GPU on the server, or the reader's question
-- travelling somewhere else.
--
-- Dropped rather than left in place because dead schema reads as intent. The
-- next person to open this database would reasonably conclude that chunking and
-- embeddings are part of the design and that something is merely unfinished,
-- and would either build toward it or avoid disturbing it. Both cost more than
-- this drop.
--
-- The other unused tables are deliberately kept. `organizations`, `org_members`,
-- `org_domains`, `verifications`, `user_identities`, `user_domains` and
-- `domain_texts` are ahead of their features rather than behind them, and the
-- four-role model they serve is documented in docs/ESSENCE.md.

-- answer_citations.chunk_id points at a concept that no longer exists, so it
-- goes with it. The table itself is kept: it belongs to the persisted-answers
-- design that answer_audit partly replaced, and removing it in passing would be
-- deciding that question rather than leaving it open.
ALTER TABLE "answer_citations" DROP COLUMN IF EXISTS "chunk_id";--> statement-breakpoint

DROP TABLE IF EXISTS "article_chunks";
