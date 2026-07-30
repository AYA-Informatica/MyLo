import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface ReplyInterface {
  id: string;
  content: string;
  authorId: string;
  commentId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type CreateReplyInterface = Omit<ReplyInterface, 'id' | 'deletedAt' | 'commentId'>;
type UpdateReplyInterface = Partial<Omit<ReplyInterface, 'id' | 'createdAt' | 'commentId'>>;

interface ReplyRequestInterface extends IRequestUser {
  body: CreateReplyInterface;
  params: {
    postId: string;
    commentId: string;
    replyId?: string;
  };
}

interface UpdateReplyRequestInterface extends IRequestUser {
  body: UpdateReplyInterface;
  params: {
    postId: string;
    commentId: string;
    replyId: string;
  };
}

interface GetAllReplies {
  replies: ReplyInterface[];
}

export {
  ReplyInterface,
  CreateReplyInterface,
  UpdateReplyInterface,
  ReplyRequestInterface,
  UpdateReplyRequestInterface,
  GetAllReplies,
};
