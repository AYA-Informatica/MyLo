import { Router } from 'express';
import {
  uploadDocument,
  queryDocument,
  getDocuments,
  updateDocumentById,
  deleteDocumentById,
  getQueryHistory,
} from './controller';
import { pdfUpload } from '../../../utils/upload';

const chatbotRouter = Router();

const upload = pdfUpload();

chatbotRouter.post('/upload', upload.array('files', 10), uploadDocument);
chatbotRouter.post('/query', queryDocument);
chatbotRouter.get('/query-history', getQueryHistory);
chatbotRouter.get('/', getDocuments);
chatbotRouter.put('/:id', updateDocumentById);
chatbotRouter.delete('/:id', deleteDocumentById);

export default chatbotRouter;