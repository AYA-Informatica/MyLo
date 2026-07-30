import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import {
  CreateArticleInterface,
  GetAllArticles,
  ArticleInterface,
  UpdateArticleInterface,
} from './articles';
import { Op } from 'sequelize';

export class ArticleService {
  data: ArticleInterface | CreateArticleInterface | UpdateArticleInterface;
  dataId: string;
  lawId: string;
  res: Response;

  constructor(
    data: ArticleInterface | CreateArticleInterface | UpdateArticleInterface,
    dataId: string,
    lawId: string,
    res: Response,
  ) {
    this.data = data;
    this.dataId = dataId;
    this.lawId = lawId;
    this.res = res;
  }

  private async lawExists(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const law = await Database.Law.findOne({ where: { id: this.lawId }, raw: true });
      if (!law) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async articleExists(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const article = await Database.Article.findOne({
        where: { id: this.dataId, lawId: this.lawId },
        raw: true,
      });
      if (!article) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async articleNumberExists(
    articleNumber: string,
    excludeId?: string,
  ): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const whereCondition: {
        lawId: string;
        articleNumber: string;
        id?: { [Op.ne]?: string };
      } = { lawId: this.lawId, articleNumber };
      if (excludeId) {
        whereCondition.id = { [Op.ne]: excludeId };
      }

      const article = await Database.Article.findOne({ where: whereCondition, raw: true });
      if (article) {
        return { exists: true };
      } else {
        return { exists: false };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  async create(): Promise<unknown> {
    try {
      const { articleNumber, title, content } = this.data as CreateArticleInterface;

      // Validate law exists
      const lawCheck = await this.lawExists();
      if (lawCheck.error) {
        const { message, stack } = lawCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!lawCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law not found',
          res: this.res,
        });
      }

      // Check if article number already exists for this law
      const articleNumberCheck = await this.articleNumberExists(articleNumber);
      if (articleNumberCheck.error) {
        const { message, stack } = articleNumberCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (articleNumberCheck.exists) {
        return ResponseService({
          data: null,
          status: 409,
          success: false,
          message: 'Article number already exists for this law',
          res: this.res,
        });
      }

      const article = await Database.Article.create({
        lawId: this.lawId,
        articleNumber,
        title,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: article,
        status: 201,
        success: true,
        message: 'Article successfully created',
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
      // Validate law exists
      const lawCheck = await this.lawExists();
      if (lawCheck.error) {
        const { message, stack } = lawCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!lawCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law not found',
          res: this.res,
        });
      }

      const articles = await Database.Article.findAll({
        where: { lawId: this.lawId },
        include: [
          {
            model: Database.Law,
            as: 'law',
            attributes: ['id', 'lawNumber', 'title'],
          },
        ],
        order: [['articleNumber', 'ASC']],
      });

      if (!articles || articles.length === 0) {
        return ResponseService<GetAllArticles[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No articles found',
          res: this.res,
        });
      }

      return ResponseService({
        data: articles,
        status: 200,
        message: 'Articles successfully retrieved',
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
      const lawCheck = await this.lawExists();
      if (lawCheck.error) {
        const { message, stack } = lawCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!lawCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law not found',
          res: this.res,
        });
      }

      const articleCheck = await this.articleExists();
      if (articleCheck.error) {
        const { message, stack } = articleCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!articleCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Article not found',
          res: this.res,
        });
      }

      const article = await Database.Article.findOne({
        where: { id: this.dataId, lawId: this.lawId },
        include: [
          {
            model: Database.Law,
            as: 'law',
            attributes: ['id', 'lawNumber', 'title'],
          },
        ],
      });

      return ResponseService({
        data: article,
        status: 200,
        message: 'Article successfully retrieved',
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
      const lawCheck = await this.lawExists();
      if (lawCheck.error) {
        const { message, stack } = lawCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!lawCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law not found',
          res: this.res,
        });
      }

      const articleCheck = await this.articleExists();
      if (articleCheck.error) {
        const { message, stack } = articleCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!articleCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Article not found',
          res: this.res,
        });
      }

      const updateData: UpdateArticleInterface = { ...this.data };

      // Check if article number is being updated and if it conflicts
      if (updateData.articleNumber) {
        const articleNumberCheck = await this.articleNumberExists(
          updateData.articleNumber,
          this.dataId,
        );
        if (articleNumberCheck.error) {
          const { message, stack } = articleNumberCheck.error as Error;
          return ResponseService({
            data: { message, stack },
            success: false,
            status: 500,
            res: this.res,
          });
        }

        if (articleNumberCheck.exists) {
          return ResponseService({
            data: null,
            status: 409,
            success: false,
            message: 'Article number already exists for this law',
            res: this.res,
          });
        }
      }

      const updatedArticle = await Database.Article.update(
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId, lawId: this.lawId } },
      );

      return ResponseService({
        data: updatedArticle,
        success: true,
        status: 200,
        message: 'Article successfully updated',
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
      const lawCheck = await this.lawExists();
      if (lawCheck.error) {
        const { message, stack } = lawCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!lawCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law not found',
          res: this.res,
        });
      }

      const articleCheck = await this.articleExists();
      if (articleCheck.error) {
        const { message, stack } = articleCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!articleCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Article not found',
          res: this.res,
        });
      }

      const deletedArticle = await Database.Article.destroy({
        where: { id: this.dataId, lawId: this.lawId },
      });

      return ResponseService({
        data: deletedArticle,
        success: true,
        status: 200,
        message: 'Article successfully deleted',
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