import { Response } from 'express';
import { ArticleService } from './service';
import { ArticleRequestInterface, UpdateArticleRequestInterface } from './articles';

export class ArticleController {
  public async createArticle(req: ArticleRequestInterface, res: Response): Promise<void> {
    try {
      const { lawId } = req.params;
      const articleService = new ArticleService(req.body, '', lawId, res);
      articleService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllArticles(req: ArticleRequestInterface, res: Response): Promise<void> {
    try {
      const { lawId } = req.params;
      const articleService = new ArticleService(req.body, '', lawId, res);
      articleService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getArticle(req: ArticleRequestInterface, res: Response): Promise<void> {
    try {
      const { lawId, id } = req.params;
      const articleService = new ArticleService(req.body, id, lawId, res);
      articleService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateArticle(req: UpdateArticleRequestInterface, res: Response): Promise<void> {
    try {
      const { lawId, id } = req.params;
      const articleService = new ArticleService(req.body, id, lawId, res);
      articleService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteArticle(req: ArticleRequestInterface, res: Response): Promise<void> {
    try {
      const { lawId, id } = req.params;
      const articleService = new ArticleService(req.body, id, lawId, res);
      articleService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}