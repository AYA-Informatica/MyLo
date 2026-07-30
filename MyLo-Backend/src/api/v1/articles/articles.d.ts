import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface ArticleInterface {
  id: string;
  lawId: string;
  articleNumber: string;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type CreateArticleInterface = Omit<ArticleInterface, 'id' | 'deletedAt'>;
type UpdateArticleInterface = Partial<Omit<ArticleInterface, 'id' | 'lawId' | 'createdAt'>>;

interface ArticleRequestInterface extends IRequestUser {
  body: CreateArticleInterface;
  params: {
    lawId: string;
    id: string;
  };
}

interface UpdateArticleRequestInterface extends IRequestUser {
  body: UpdateArticleInterface;
  params: {
    lawId: string;
    id: string;
  };
}

interface GetAllArticles {
  articles: ArticleInterface[];
}

export {
  ArticleInterface,
  CreateArticleInterface,
  UpdateArticleInterface,
  ArticleRequestInterface,
  UpdateArticleRequestInterface,
  GetAllArticles,
};