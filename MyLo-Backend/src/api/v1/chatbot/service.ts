import fs from 'fs';
import pdf from 'pdf-parse';
import fetch from 'node-fetch';
import { Database } from '../../../database';
import { getEmbedding, generateAnswer } from './AIservice';
import { chunkText } from '../../../utils/chunker';
import { QueryTypes } from 'sequelize';
import { infoLogger, errorLogger } from '../../../utils/logger';

interface Document {
  id: number;
  filename: string;
  filepath: string;
  content: string;
  embedding: number[];
  created_at: Date;
}

interface QueryResult extends Document {
  distance: number;
}

interface HistoryRecord {
  id: number;
  question: string;
  answer: string;
  source: 'database' | 'web';
  created_at: Date;
}

interface DuckDuckGoResponse {
  AbstractText?: string;
  RelatedTopics?: Array<{ Text?: string }>;
}

function formatEmbeddingForSQL(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

async function searchWeb(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`,
    );
    const data = (await response.json()) as DuckDuckGoResponse;

    if (data?.AbstractText && data.AbstractText.length > 0) {
      return data.AbstractText;
    }

    if (data?.RelatedTopics && data.RelatedTopics.length > 0) {
      return data.RelatedTopics[0].Text ?? 'No clear web definition found.';
    }

    return 'No clear web definition found.';
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    errorLogger(error, 'searchWeb');
    return 'Failed to fetch from web.';
  }
}

async function insertDocumentChunk(
  filename: string,
  filepath: string,
  chunk: string,
): Promise<Document | null> {
  const embedding = await getEmbedding(chunk);
  const formatted = formatEmbeddingForSQL(embedding);

  const result = await Database.database.query<Document>(
    'INSERT INTO documents (filename, filepath, content, embedding, created_at, updated_at) VALUES ($1, $2, $3, $4::vector, NOW(), NOW()) RETURNING *',
    {
      bind: [filename, filepath, chunk, formatted],
      type: QueryTypes.SELECT,
    },
  );

  return result && result.length > 0 ? result[0] : null;
}

async function searchSimilarDocuments(
  questionEmbedding: number[],
  limit: number = 5,
): Promise<QueryResult[]> {
  const formatted = formatEmbeddingForSQL(questionEmbedding);

  return await Database.database.query<QueryResult>(
    `
    SELECT id, filename, filepath, content, embedding <#> $1::vector AS distance
    FROM documents
    ORDER BY distance
    LIMIT $2
    `,
    {
      bind: [formatted, limit],
      type: QueryTypes.SELECT,
    },
  );
}

async function saveQueryHistory(
  question: string,
  answer: string,
  source: 'database' | 'web',
): Promise<void> {
  await Database.database.query(
    'INSERT INTO history (question, answer, source) VALUES ($1, $2, $3)',
    {
      bind: [question, answer, source],
      type: QueryTypes.INSERT,
    },
  );
}

export async function uploadPDFDocument(
  file: Express.Multer.File,
): Promise<{ chunks: Document[]; totalChunks: number }> {
  const pdfBuffer = fs.readFileSync(file.path);
  const pdfData = await pdf(pdfBuffer);
  const cleanText = pdfData.text.replace(/\s+/g, ' ').trim();
  const chunks = chunkText(cleanText, 1000, 100);

  const inserted: Document[] = [];

  for (const chunk of chunks) {
    const doc = await insertDocumentChunk(file.originalname, file.path, chunk);
    if (doc) {
      inserted.push(doc);
    }
  }

  infoLogger(
    `Uploaded ${inserted.length} chunks from file ${file.originalname}`,
    'uploadPDFDocument',
  );

  return { chunks: inserted, totalChunks: inserted.length };
}

export async function processQuery(
  question: string,
): Promise<{ answer: string; documents: QueryResult[]; source: 'database' | 'web' }> {
  const questionEmbedding = await getEmbedding(question);
  const similarDocs = await searchSimilarDocuments(questionEmbedding);

  let context = similarDocs.map((doc) => doc.content).join('\n\n---\n\n');
  let source: 'database' | 'web' = 'database';

  if (!similarDocs.length || !context.trim()) {
    context = await searchWeb(question);
    source = 'web';
  }

  const answer = await generateAnswer(context, question);

  await saveQueryHistory(question, answer, source);

  infoLogger(`Answered question: "${question}" (source: ${source})`, 'processQuery');

  return {
    answer:
      source === 'web'
        ? `No relevant information found in uploaded documents. Here's information from the web:\n\n${answer}`
        : answer,
    documents: similarDocs,
    source,
  };
}

export async function fetchQueryHistory(): Promise<HistoryRecord[]> {
  const result = await Database.database.query<HistoryRecord>(
    'SELECT * FROM history ORDER BY created_at DESC',
    {
      type: QueryTypes.SELECT,
    },
  );

  infoLogger('Fetched query history', 'fetchQueryHistory');
  return result;
}

export async function fetchAllDocuments(): Promise<Document[]> {
  const result = await Database.database.query<Document>(
    'SELECT * FROM documents ORDER BY created_at DESC',
    { type: QueryTypes.SELECT },
  );

  infoLogger('Fetched all documents', 'fetchAllDocuments');
  return result;
}

export async function updateDocumentContent(
  id: number,
  content: string,
): Promise<Document | null> {
  const embedding = await getEmbedding(content);
  const formatted = formatEmbeddingForSQL(embedding);

  const result = await Database.database.query<Document>(
    'UPDATE documents SET content=$1, embedding=$2::vector WHERE id=$3 RETURNING *',
    {
      bind: [content, formatted, id],
      type: QueryTypes.SELECT,
    },
  );

  if (!result || result.length === 0) {
    return null;
  }

  infoLogger(`Updated document ${id}`, 'updateDocumentContent');
  return result[0];
}

export async function removeDocument(id: number): Promise<boolean> {
  const result = await Database.database.query(
    'DELETE FROM documents WHERE id=$1 RETURNING *',
    {
      bind: [id],
      type: QueryTypes.SELECT,
    },
  );

  if (!result || result.length === 0) {
    return false;
  }

  infoLogger(`Deleted document ${id}`, 'removeDocument');
  return true;
}