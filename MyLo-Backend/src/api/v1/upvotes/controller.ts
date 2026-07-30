import { Response } from 'express';
import { UpvoteService } from './service';
import { UpvoteRequestInterface, DeleteUpvoteRequestInterface } from './upvotes';

export class UpvoteController {
  public async createUpvote(req: UpvoteRequestInterface, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const user = req?.user?.id as string;
      const upvoteService = new UpvoteService(user, '', postId, res);
      upvoteService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllUpvotes(req: UpvoteRequestInterface, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const user = req?.user?.id || '';
      const upvoteService = new UpvoteService(user, '', postId, res);
      upvoteService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteUpvote(req: DeleteUpvoteRequestInterface, res: Response): Promise<void> {
    try {
      const { postId, upvoteId } = req.params;
      const user = req?.user?.id as string;
      const upvoteService = new UpvoteService(user, upvoteId, postId, res);
      upvoteService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}
