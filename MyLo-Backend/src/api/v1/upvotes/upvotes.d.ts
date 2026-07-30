import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface UpvoteInterface {
  id: string;
  userId: string;
  postId: string;
  createdAt?: Date;
}

type CreateUpvoteInterface = Omit<UpvoteInterface, 'id' | 'postId'>;

interface UpvoteRequestInterface extends IRequestUser {
  body?: CreateUpvoteInterface;
  params: {
    postId: string;
    upvoteId?: string;
  };
}

interface DeleteUpvoteRequestInterface extends IRequestUser {
  params: {
    postId: string;
    upvoteId: string;
  };
}

interface GetAllUpvotes {
  upvotes: UpvoteInterface[];
}

export {
  UpvoteInterface,
  CreateUpvoteInterface,
  UpvoteRequestInterface,
  DeleteUpvoteRequestInterface,
  GetAllUpvotes,
};
