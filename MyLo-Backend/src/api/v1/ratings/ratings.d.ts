import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface RatingInterface {
  id: string;
  star: number;
  review?: string;
  userId: string;
  firmId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type CreateRatingInterface = Omit<RatingInterface, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateRatingInterface = Partial<
  Omit<RatingInterface, 'id' | 'createdAt' | 'userId' | 'firmId'>
>;

interface GetAllRatings {
  ratings: RatingInterface[];
}

interface RatingRequestInterface extends IRequestUser {
  body: CreateRatingInterface;
  params: {
    id: string;
    firmId?: string;
  };
}

interface UpdateRatingRequestInterface extends IRequestUser {
  body: UpdateRatingInterface;
  params: {
    id: string;
    firmId?: string;
  };
}

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStar: number;
}

export {
  RatingInterface,
  CreateRatingInterface,
  UpdateRatingInterface,
  GetAllRatings,
  RatingRequestInterface,
  UpdateRatingRequestInterface,
  RatingStats,
};
