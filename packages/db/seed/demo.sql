-- A minimal but complete vertical slice of the corpus, used to prove the schema
-- delivers what the previous one could not: a retrieval result that resolves to
-- law + article + language + status, with an approved plain-language explanation.
--
--   docker exec -i mylo_postgres psql -U postgres -d mylo < packages/db/seed/demo.sql
--
-- The embedding here is a constant vector. Real chunks are embedded at ingest;
-- this exists so the join and the vector index can be exercised without a key.

BEGIN;

INSERT INTO domains (id, slug)
VALUES ('11111111-1111-1111-1111-111111111111', 'family')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO domain_texts (domain_id, language, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'rw', 'Amategeko y''umuryango'),
  ('11111111-1111-1111-1111-111111111111', 'en', 'Family Law'),
  ('11111111-1111-1111-1111-111111111111', 'fr', 'Droit de la famille')
ON CONFLICT (domain_id, language) DO NOTHING;

-- The instrument: language-independent facts only.
INSERT INTO laws (id, law_number, origin, domain_id, status, gazette_ref, published_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'N° 32/2016',
  'parliamentary',
  '11111111-1111-1111-1111-111111111111',
  'active',
  'O.G. n° 37 of 12/09/2016',
  '2016-09-12'
)
ON CONFLICT (law_number) DO NOTHING;

-- The words, one row per language. Only the official one is marked official.
INSERT INTO law_texts (law_id, language, title, is_official, review_status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'en',
  'Law governing persons and family',
  true,
  'approved'
)
ON CONFLICT (law_id, language) DO NOTHING;

-- Articles are the unit of citation.
INSERT INTO articles (id, law_id, article_number, ordinal)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  '12',
  12
)
ON CONFLICT (law_id, article_number) DO NOTHING;

INSERT INTO article_texts (id, article_id, language, heading, body, is_official, review_status)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'en',
  'Minimum age of marriage',
  'No person may contract marriage before attaining eighteen (18) years of age.',
  true,
  'approved'
)
ON CONFLICT (article_id, language) DO NOTHING;

-- A retrieval chunk. article_id is NOT NULL, so this can always be cited.
INSERT INTO article_chunks (article_id, article_text_id, language, ordinal, content, embedding, embedding_model)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  'en',
  0,
  'No person may contract marriage before attaining eighteen (18) years of age.',
  (SELECT ('[' || string_agg('0.01', ',') || ']')::vector FROM generate_series(1, 1536)),
  'text-embedding-3-small'
)
ON CONFLICT (article_text_id, ordinal) DO NOTHING;

-- The headline promise: plain language, in Kinyarwanda, human-approved.
INSERT INTO explanations (article_id, language, body, reading_level, review_status)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'rw',
  'Ntawe ushobora gushyingirwa atarageza ku myaka 18.',
  'general',
  'approved'
);

COMMIT;
