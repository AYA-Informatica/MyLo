import { Response } from 'express';
import { ReplyService } from './service';
import { ReplyRequestInterface, UpdateReplyRequestInterface } from './replies';

export class ReplyController {
  public async createReply(req: ReplyRequestInterface, res: Response): Promise<void> {
    try {
      const { postId, commentId } = req.params;
      const user = req?.user?.id as string;
      const replyService = new ReplyService(req.body, user, '', commentId, postId, res);
      replyService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllReplies(req: ReplyRequestInterface, res: Response): Promise<void> {
    try {
      const { postId, commentId } = req.params;
      const user = req?.user?.id || '';
      const replyService = new ReplyService(req.body, user, '', commentId, postId, res);
      replyService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAReply(req: ReplyRequestInterface, res: Response): Promise<void> {
    try {
      const { postId, commentId, replyId } = req.params;
      const user = req?.user?.id || '';
      const replyService = new ReplyService(
        req.body,
        user,
        replyId as string,
        commentId,
        postId,
        res,
      );
      replyService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateReply(req: UpdateReplyRequestInterface, res: Response): Promise<void> {
    try {
      const { postId, commentId, replyId } = req.params;
      const user = req?.user?.id as string;
      const replyService = new ReplyService(req.body, user, replyId, commentId, postId, res);
      replyService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteReply(req: ReplyRequestInterface, res: Response): Promise<void> {
    try {
      const { postId, commentId, replyId } = req.params;
      const user = req?.user?.id as string;
      const replyService = new ReplyService(
        req.body,
        user,
        replyId as string,
        commentId,
        postId,
        res,
      );
      replyService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}
