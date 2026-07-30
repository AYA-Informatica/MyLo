import OpenAI from 'openai';
import { config } from 'dotenv';

config();

/**
 * Whether the AI assistant is configured on this deployment.
 *
 * The chatbot is one feature among many, so a missing key must not be fatal:
 * this module is reached from the route tree during startup, and throwing here
 * took the entire API down before it could listen.
 */
export const isAIEnabled = Boolean(process.env.OPENAI_API_KEY);

let client: OpenAI | null = null;

/**
 * Returns the shared OpenAI client, constructing it on first use.
 *
 * Throws only when AI features are actually exercised without a key, which
 * surfaces as a failed chat request rather than an unbootable server.
 */
export const getOpenAIClient = (): OpenAI => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set — the AI assistant is unavailable on this server.');
  }

  if (!client) {
    client = new OpenAI({
      // Defaults to the ChatAnywhere proxy this project was built against.
      // Set OPENAI_BASE_URL to talk to api.openai.com directly.
      baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.chatanywhere.tech/v1',
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
};

export default getOpenAIClient;
