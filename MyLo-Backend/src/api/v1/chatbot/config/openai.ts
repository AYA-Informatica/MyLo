import OpenAI from 'openai';
import { config } from 'dotenv';

config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const client = new OpenAI({
  baseURL: 'https://api.chatanywhere.tech/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

export default client;