import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import { GetAllUpvotes } from './upvotes';

export class UpvoteService {
  userId: string;
  upvoteId: string;
  postId: string;
  res: Response;

  constructor(userId: string, upvoteId: string, postId: string, res: Response) {
    this.userId = userId;
    this.upvoteId = upvoteId;
    this.postId = postId;
    this.res = res;
  }

  private async upvoteExists(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const upvote = await Database.Upvote.findOne({ where: { id: this.upvoteId }, raw: true });
      if (!upvote) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async userAlreadyUpvoted(): Promise<{
    exists: boolean;
    upvote?: unknown;
    error?: unknown;
  }> {
    try {
      const upvote = await Database.Upvote.findOne({
        where: { userId: this.userId, postId: this.postId },
        raw: true,
      });
      if (upvote) {
        return { exists: true, upvote };
      } else {
        return { exists: false };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  async create(): Promise<unknown> {
    try {
      const user = await Database.User.findOne({ where: { id: this.userId }, raw: true });
      if (!user) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'User not found',
          res: this.res,
        });
      }

      const post = await Database.Post.findOne({ where: { id: this.postId }, raw: true });
      if (!post) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Post not found',
          res: this.res,
        });
      }

      // Check if user has already upvoted this post
      const existingUpvote = await this.userAlreadyUpvoted();
      if (existingUpvote.error) {
        const { message, stack } = existingUpvote.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (existingUpvote.exists) {
        return ResponseService({
          data: existingUpvote.upvote,
          status: 409,
          success: false,
          message: 'You have already upvoted this post',
          res: this.res,
        });
      }

      const upvote = await Database.Upvote.create({
        userId: this.userId,
        postId: this.postId,
        createdAt: new Date(),
      });

      return ResponseService({
        data: upvote,
        status: 201,
        success: true,
        message: 'Post successfully upvoted',
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async findAll(): Promise<unknown> {
    try {
      const post = await Database.Post.findOne({ where: { id: this.postId } });
      if (!post) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Post not found',
          res: this.res,
        });
      }

      const upvotes = await Database.Upvote.findAll({
        where: { postId: this.postId },
        include: [
          {
            model: Database.User,
            as: 'user',
            attributes: ['id', 'name', 'username'],
          },
          {
            model: Database.Post,
            as: 'post',
            attributes: ['id', 'title', 'slug'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      if (!upvotes || upvotes.length === 0) {
        return ResponseService<GetAllUpvotes[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No upvotes found for this post',
          res: this.res,
        });
      }

      return ResponseService({
        data: upvotes,
        status: 200,
        message: 'Upvotes successfully retrieved',
        success: true,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async delete(): Promise<unknown> {
    try {
      const post = await Database.Post.findOne({ where: { id: this.postId } });
      if (!post) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Post not found',
          res: this.res,
        });
      }

      const upvoteCheck = await this.upvoteExists();

      if (upvoteCheck.error) {
        const { message, stack } = upvoteCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!upvoteCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Upvote not found',
          res: this.res,
        });
      }

      // Verify that the upvote belongs to the authenticated user
      const upvote = await Database.Upvote.findOne({
        where: { id: this.upvoteId, userId: this.userId, postId: this.postId },
        raw: true,
      });

      if (!upvote) {
        return ResponseService({
          data: null,
          status: 403,
          success: false,
          message: 'You can only remove your own upvotes',
          res: this.res,
        });
      }

      const deletedUpvote = await Database.Upvote.destroy({
        where: { id: this.upvoteId, userId: this.userId },
      });

      return ResponseService({
        data: deletedUpvote,
        success: true,
        status: 200,
        message: 'Upvote successfully removed',
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }
}
