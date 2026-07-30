import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import {
  CreateCommentInterface,
  GetAllComments,
  CommentInterface,
  UpdateCommentInterface,
} from './comments';

export class CommentService {
  data: CommentInterface | CreateCommentInterface | UpdateCommentInterface;
  userId: string;
  dataId: string;
  postId: string;
  res: Response;

  constructor(
    data: CommentInterface | CreateCommentInterface | UpdateCommentInterface,
    userId: string,
    dataId: string,
    postId: string,
    res: Response,
  ) {
    this.data = data;
    this.userId = userId;
    this.dataId = dataId;
    this.postId = postId;
    this.res = res;
  }

  private async commentExist(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const comment = await Database.Comment.findOne({ where: { id: this.dataId }, raw: true });
      if (!comment) {
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

      const { content } = this.data as CreateCommentInterface;

      const comment = await Database.Comment.create({
        content,
        authorId: author.id,
        postId: this.postId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: comment,
        status: 201,
        success: true,
        message: 'Comment successfully created',
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
      const comments = await Database.Comment.findAll({
        where: { postId: this.postId },
        include: [
          {
            model: Database.User,
            as: 'author',
            attributes: ['id', 'name', 'username'],
          },
          {
            model: Database.Post,
            as: 'post',
            attributes: ['id', 'title', 'slug'],
          },
        ],
      });
      if (!comments || comments.length === 0) {
        return ResponseService<GetAllComments[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No comments found',
          res: this.res,
        });
      }
      return ResponseService({
        data: comments,
        status: 200,
        message: 'Comments successfully retrieved',
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

      const commentCheck = await this.commentExist();

      if (commentCheck.error) {
        const { message, stack } = commentCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!commentCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Comment not found',
          res: this.res,
        });
      }
      const comment = await Database.Comment.findOne({
        where: { id: this.dataId, postId: this.postId },
        include: [
          {
            model: Database.User,
            as: 'author',
            attributes: ['id', 'name', 'username'],
          },
          {
            model: Database.Post,
            as: 'post',
            attributes: ['id', 'title', 'slug'],
          },
        ],
      });

      return ResponseService({
        data: comment,
        status: 200,
        message: 'Comment successfully retrieved',
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
      const commentCheck = await this.commentExist();
      if (commentCheck.error) {
        const { message, stack } = commentCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }
      if (!commentCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Comment not found',
          res: this.res,
        });
      }

      const updateData: UpdateCommentInterface = { ...this.data };

      const updatedComment = await Database.Comment.update(
        {
          ...updateData,
          authorId: this.userId,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId } },
      );

      return ResponseService({
        data: updatedComment,
        success: true,
        status: 200,
        message: 'Comment successfully updated',
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
      const commentCheck = await this.commentExist();

      if (commentCheck.error) {
        const { message, stack } = commentCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!commentCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Comment not found',
          res: this.res,
        });
      }

      const deletedComment = await Database.Comment.destroy({ where: { id: this.dataId } });

      return ResponseService({
        data: deletedComment,
        success: true,
        status: 200,
        message: 'Comment successfully deleted',
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
