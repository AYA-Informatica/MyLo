import { Response } from 'express';
import { PostService } from './service';
import { PostRequestInterface, UpdatePostRequestInterface } from './posts';

export class PostController {
  public async createPost(req: PostRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const { file } = req;
      const postService = new PostService(req.body, user, id, file as Express.Multer.File, res);
      postService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllPosts(req: PostRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const { file } = req;
      const postService = new PostService(req.body, user, id, file as Express.Multer.File, res);
      postService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAPost(req: PostRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const { file } = req;
      const postService = new PostService(req.body, user, id, file as Express.Multer.File, res);
      postService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }
  public async updatePost(req: UpdatePostRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const { file } = req;
      const postService = new PostService(req.body, user, id, file as Express.Multer.File, res);
      postService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deletePost(req: PostRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const { file } = req;
      const postService = new PostService(req.body, user, id, file as Express.Multer.File, res);
      postService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}
