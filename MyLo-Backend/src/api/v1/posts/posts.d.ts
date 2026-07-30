import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface PostInterface {
  id: string;
  title?: string;
  slug?: string;
  content: string;
  image_url?: string;
  authorId: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt: Date | null;
}

type CreatePostInterface = Omit<PostInterface, 'id' | 'deletedAt'>;
type UpdatePostInterface = Partial<Omit<PostInterface, 'id' | 'createdAt'>>;

interface PostRequestInterface extends IRequestUser {
  body: CreatePostInterface;
  params: {
    id: string;
  };
  file?: Express.Multer.File;
}
interface UpdatePostRequestInterface extends IRequestUser {
  body: UpdatePostInterface;
  params: {
    id: string;
  };
  file?: Express.Multer.File;
}

interface GetAllPosts {
  posts: PostInterface[];
}
