import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface CommentInterface {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type CreateCommentInterface = Omit<CommentInterface, 'id' | 'deletedAt' | 'postId'>;
type UpdateCommentInterface = Partial<Omit<CommentInterface, 'id' | 'createdAt' | 'postId'>>;

interface CommentRequestInterface extends IRequestUser {
  body: CreateCommentInterface;
  params: {
    id: string;
    postId: string;
  };
}

interface UpdateCommentRequestInterface extends IRequestUser {
  body: UpdateCommentInterface;
  params: {
    id: string;
    postId: string;
  };
}

interface GetAllComments {
  comments: CommentInterface[];
}

export {
  CommentInterface,
  CreateCommentInterface,
  UpdateCommentInterface,
  CommentRequestInterface,
  UpdateCommentRequestInterface,
  GetAllComments,
};
