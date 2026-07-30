import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import redis from './redis';
import { v4 as uuidv4 } from 'uuid';
import { errorLogger, logger } from './logger';
config();

export const generateSlug = (title?: string): string => {
  if (!title) {
    title = '' as string;
    return title;
  }
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const hashPassword = async (password: string): Promise<string> =>
  await bcrypt.hash(password, 10);

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> =>
  await bcrypt.compare(password, hashedPassword);

export const secretKey = process.env.JWT_SECRET || 'secretKey';

export const generateToken = async ({
  id,
  email,
  role,
  provider = 'local',
}: {
  id: string;
  email: string;
  role: string;
  provider?: string;
}): Promise<string> => {
  const payload = { id, email, role, provider };
  const jti = uuidv4();
  const tokenPayload = { ...payload, jti };
  const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '12h' });

  await Promise.all([
    redis.setEx(`jwt:${jti}`, 12 * 60 * 60, JSON.stringify(tokenPayload)),
    redis.sAdd(`user_tokens:${id}`, jti), // Track user's active tokens
    redis.expire(`user_tokens:${id}`, 12 * 60 * 60), // Set expiry for user token set
  ]);

  return token;
};

interface DecodedToken {
  id: string;
  email: string;
  role: string;
  provider?: string;
  jti: string;
}

export const verifyToken = async (token: string): Promise<DecodedToken> => {
  try {
    const decoded = jwt.verify(token, secretKey) as DecodedToken;
    const storedData = await redis.get(`jwt:${decoded.jti}`);
    if (!storedData) {
      throw new Error('Token not found in Redis - may have been revoked');
    }
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new Error('Token has been blacklisted');
    }
    return decoded;
  } catch (error) {
    errorLogger(error as Error, 'Token Verification');
    throw error;
  }
};

export const destroyToken = async (token: string | undefined): Promise<void> => {
  try {
    if (!token) {
      return;
    }

    const decoded = jwt.decode(token) as DecodedToken | null;
    if (decoded?.jti) {
      await Promise.all([
        redis.del(`jwt:${decoded.jti}`),
        redis.sRem(`user_tokens:${decoded.id}`, decoded.jti),
        redis.setEx(
          `blacklist:${token}`,
          24 * 60 * 60,
          JSON.stringify({
            destroyedAt: new Date().toISOString(),
            reason: 'user_logout',
            userId: decoded.id,
            jti: decoded.jti,
          }),
        ),
      ]);
    } else {
      await redis.setEx(`blacklist:${token}`, 24 * 60 * 60, 'revoked');
    }
    logger.info(`Token destroyed successfully: ${decoded?.jti || 'unknown'}`);
  } catch (error) {
    errorLogger(error as Error, 'Token Destruction');
    throw error;
  }
};

export const generateUnsubscribeToken = (email: string): string =>
  jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '1d' });
