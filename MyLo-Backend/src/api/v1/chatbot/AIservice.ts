import client from './config/openai';
import { errorLogger } from '../../../utils/logger';

/**
 * Generate embeddings using OpenAI's embedding API
 * Model: text-embedding-3-small (1536 dimensions, fast and cost-effective)
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    errorLogger(error as Error, 'getEmbedding');
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate answer using OpenAI's GPT model with context from RAG
 */
export async function generateAnswer(context: string, question: string): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful legal assistant for Menyalo, a Rwandan legal information platform. 
Answer questions accurately based on the provided context from the Rwanda Law Gazette. 
Be concise, clear, and cite specific laws when relevant. 
If the context doesn't contain the answer, say so honestly.`,
        },
        {
          role: 'user',
          content: `Context from Rwanda Law Gazette:
${context}

Question: ${question}

Provide a clear, concise answer in 2-4 sentences.`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    return completion.choices[0].message.content || 'Unable to generate answer.';
  } catch (error) {
    errorLogger(error as Error, 'generateAnswer');
    throw new Error('Failed to generate answer using AI');
  }
}