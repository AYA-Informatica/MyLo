import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import {
  CreateReplyInterface,
  GetAllReplies,
  ReplyInterface,
  UpdateReplyInterface,
} from './replies';

export class ReplyService {
  data: ReplyInterface | CreateReplyInterface | UpdateReplyInterface;
  userId: string;
  replyId: string;
  commentId: string;
  postId: string;
  res: Response;

  constructor(
    data: ReplyInterface | CreateReplyInterface | UpdateReplyInterface,
    userId: string,
    replyId: string,
    commentId: string,
    postId: string,
    res: Response,
  ) {
    this.data = data;
    this.userId = userId;
    this.replyId = replyId;
    this.commentId = commentId;
    this.postId = postId;
    this.res = res;
  }

  private async replyExists(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const reply = await Database.Reply.findOne({ where: { id: this.replyId }, raw: true });
      if (!reply) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  async create(): Promise<unknown> {
    try {
      const author = await Database.User.findOne({ where: { id: this.userId }, raw: true });
      if (!author) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Author not found',
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

      const comment = await Database.Comment.findOne({
        where: { id: this.commentId, postId: this.postId },
        raw: true,
      });
      if (!comment) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Comment not found',
          res: this.res,
        });
      }

      const { content } = this.data as CreateReplyInterface;

      const reply = await Database.Reply.create({
        content,
        authorId: author.id,
        commentId: this.commentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: reply,
        status: 201,
        success: true,
        message: 'Reply successfully created',
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

      const comment = await Database.Comment.findOne({
        where: { id: this.commentId, postId: this.postId },
      });
      if (!comment) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Comment not found',
          res: this.res,
        });
      }

      const replies = await Database.Reply.findAll({
        where: { commentId: this.commentId },
        include: [
          {
            model: Database.User,
            as: 'author',
            attributes: ['id', 'name', 'username'],
          },
          {
            model: Database.Comment,
            as: 'comment',
            attributes: ['id', 'content'],
            include: [
              {
                model: Database.Post,
                as: 'post',
                attributes: ['id', 'title', 'slug'],
              },
            ],
          },
        ],
      });

      if (!replies || replies.length === 0) {
        return ResponseService<GetAllReplies[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No replies found',
          res: this.res,
        });
      }

      return ResponseService({
        data: replies,
        status: 200,
        message: 'Replies successfully retrieved',
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

  async findOne(): Promise<unknown> {
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

      const comment = await Database.Comment.findOne({
        where: { id: this.commentId, postId: this.postId },
      });
      if (!comment) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Comment not found',
          res: this.res,
        });
      }

      const replyCheck = await this.replyExists();

      if (replyCheck.error) {
        const { message, stack } = replyCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!replyCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Reply not found',
          res: this.res,
        });
      }

      const reply = await Database.Reply.findOne({
        where: { id: this.replyId, commentId: this.commentId },
        include: [
          {
            model: Database.User,
            as: 'author',
            attributes: ['id', 'name', 'username'],
          },
          {
            model: Database.Comment,
            as: 'comment',
            attributes: ['id', 'content'],
            include: [
              {
                model: Database.Post,
                as: 'post',
                attributes: ['id', 'title', 'slug'],
              },
            ],
          },
        ],
      });

      return ResponseService({
        data: reply,
        status: 200,
        message: 'Reply successfully retrieved',
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

  async update(): Promise<unknown> {
    try {
      const replyCheck = await this.replyExists();
      if (replyCheck.error) {
        const { message, stack } = replyCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }
      if (!replyCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Reply not found',
          res: this.res,
        });
      }

      const updateData: UpdateReplyInterface = { ...this.data };

      const updatedReply = await Database.Reply.update(
        {
          ...updateData,
          authorId: this.userId,
          updatedAt: new Date(),
        },
        { where: { id: this.replyId } },
      );

      return ResponseService({
        data: updatedReply,
        success: true,
        status: 200,
        message: 'Reply successfully updated',
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
      const replyCheck = await this.replyExists();

      if (replyCheck.error) {
        const { message, stack } = replyCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!replyCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Reply not found',
          res: this.res,
        });
      }

      const deletedReply = await Database.Reply.destroy({ where: { id: this.replyId } });

      return ResponseService({
        data: deletedReply,
        success: true,
        status: 200,
        message: 'Reply successfully deleted',
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
