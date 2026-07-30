import { Response } from 'express';
import { IRequestUser } from '../../../../middleware/unifiedAuthMiddleware';
import { config } from 'dotenv';
config();

export const googleCallBack = (req: IRequestUser, res: Response): void => {
  try {
    // const token = req.token as string;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // res.redirect(`${frontendUrl}/feed#token=${token}`);
    res.redirect(`${frontendUrl}/feed`);
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
};
