import { config } from 'dotenv';
config(); 

export const allowedOrigins = [
  'https://menyalo-frontend.onrender.com',
  'https://menyalo-backend.onrender.com',
  'https://menyalo.vercel.app',
  `http://localhost:${process.env.PORT}`,
  'http://localhost:10000',
  'http://localhost:5001',
  'http://localhost:5000',
  'http://localhost:5173',
];
