import { Response } from 'express';
import { CommentService } from './service';
import { CommentRequestInterface, UpdateCommentRequestInterface } from './comments';

export class CommentController {
  public async createComment(req: CommentRequestInterface, res: Response): Promise<void> {
    try {
      const { id, postId } = req.params;
      const user = req?.user?.id as string;
      const commentService = new CommentService(req.body, user, id, postId, res);
      commentService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllComments(req: CommentRequestInterface, res: Response): Promise<void> {
    try {
      const { id, postId } = req.params;
      const user = req?.user?.id as string;
      const commentService = new CommentService(req.body, user, id, postId, res);
      commentService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAComment(req: CommentRequestInterface, res: Response): Promise<void> {
    try {
      const { id, postId } = req.params;
      const user = req?.user?.id as string;
      const commentService = new CommentService(req.body, user, id, postId, res);
      commentService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateComment(req: UpdateCommentRequestInterface, res: Response): Promise<void> {
    try {
      const { id, postId } = req.params;
      const user = req?.user?.id as string;
      const commentService = new CommentService(req.body, user, id, postId, res);
      commentService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteComment(req: CommentRequestInterface, res: Response): Promise<void> {
    try {
      const { id, postId } = req.params;
      const user = req?.user?.id as string;
      const commentService = new CommentService(req.body, user, id, postId, res);
      commentService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}
