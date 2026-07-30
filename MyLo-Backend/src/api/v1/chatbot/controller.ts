import { Request, Response } from 'express';
import { errorLogger } from '../../../utils/logger';
import {
  uploadPDFDocument,
  processQuery,
  fetchQueryHistory,
  fetchAllDocuments,
  updateDocumentContent,
  removeDocument,
} from './service';

function handleError(res: Response, err: unknown, context?: string): void {
  const error = err instanceof Error ? err : new Error(String(err));
  errorLogger(error, context);
  res.status(500).json({ error: error.message });
}

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const singleFile = req.file;

    if (!files && !singleFile) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const filesToProcess = files || (singleFile ? [singleFile] : []);
    const results = [];

    for (const file of filesToProcess) {
      const result = await uploadPDFDocument(file);
      results.push(result);
    }

    const totalChunks = results.reduce((sum, r) => sum + r.totalChunks, 0);
    const allChunks = results.flatMap((r) => r.chunks);

    res.status(201).json({
      message: 'Uploaded successfully',
      filesProcessed: filesToProcess.length,
      chunks: allChunks,
      totalChunks,
    });
  } catch (err: unknown) {
    handleError(res, err, 'uploadDocument');
  }
}

export async function queryDocument(req: Request, res: Response): Promise<void> {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question is required and must be a string' });
      return;
    }

    const result = await processQuery(question);

    res.json({
      answer: result.answer,
      documents: result.documents,
      source: result.source,
    });
  } catch (err: unknown) {
    handleError(res, err, 'queryDocument');
  }
}

export async function getQueryHistory(req: Request, res: Response): Promise<void> {
  try {
    const history = await fetchQueryHistory();
    res.json(history);
  } catch (err: unknown) {
    handleError(res, err, 'getQueryHistory');
  }
}

export async function getDocuments(req: Request, res: Response): Promise<void> {
  try {
    const documents = await fetchAllDocuments();
    res.json(documents);
  } catch (err: unknown) {
    handleError(res, err, 'getDocuments');
  }
}

export async function updateDocumentById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required and must be a string' });
      return;
    }

    const document = await updateDocumentContent(Number(id), content);

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(document);
  } catch (err: unknown) {
    handleError(res, err, 'updateDocumentById');
  }
}

export async function deleteDocumentById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const deleted = await removeDocument(Number(id));

    if (!deleted) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err: unknown) {
    handleError(res, err, 'deleteDocumentById');
  }
}