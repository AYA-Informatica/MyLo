import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import {
  CreateRatingInterface,
  GetAllRatings,
  RatingInterface,
  UpdateRatingInterface,
} from './ratings';

export class RatingService {
  data: RatingInterface | CreateRatingInterface | UpdateRatingInterface;
  userId: string;
  dataId: string;
  firmId: string;
  res: Response;

  constructor(
    data: RatingInterface | CreateRatingInterface | UpdateRatingInterface,
    userId: string,
    dataId: string,
    firmId: string,
    res: Response,
  ) {
    this.data = data;
    this.userId = userId;
    this.dataId = dataId;
    this.firmId = firmId;
    this.res = res;
  }

  private async ratingExist(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const rating = await Database.Rating.findOne({ where: { id: this.dataId }, raw: true });
      if (!rating) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  async create(): Promise<unknown> {
    try {
      const user = await Database.User.findOne({ where: { id: this.userId }, raw: true });
      if (!user) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'User not found',
          res: this.res,
        });
      }

      const { star, review, firmId } = this.data as CreateRatingInterface;

      // Check if firm/profile exists
      const firm = await Database.Profile.findOne({ where: { id: firmId }, raw: true });
      if (!firm) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Profile not found',
          res: this.res,
        });
      }

      // Check if user already rated this firm
      const existingRating = await Database.Rating.findOne({
        where: { userId: this.userId, firmId },
        raw: true,
      });
      if (existingRating) {
        return ResponseService({
          data: null,
          status: 409,
          success: false,
          message: 'You have already rated this profile',
          res: this.res,
        });
      }

      const rating = await Database.Rating.create({
        star,
        review,
        userId: this.userId,
        firmId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: rating,
        status: 201,
        success: true,
        message: 'Rating successfully created',
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
      const whereClause: Record<string, unknown> = {};
      if (this.firmId) {
        whereClause.firmId = this.firmId;
      }

      const ratings = await Database.Rating.findAll({
        where: whereClause,
        include: [
          {
            model: Database.User,
            as: 'user',
            attributes: ['id', 'name', 'username'],
          },
          {
            model: Database.Profile,
            as: 'firm',
            attributes: ['id', 'name', 'userRole'],
            include: [
              {
                model: Database.User,
                as: 'user',
                attributes: ['id', 'email'],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      if (!ratings || ratings.length === 0) {
        return ResponseService<GetAllRatings[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No ratings found',
          res: this.res,
        });
      }

      return ResponseService({
        data: ratings,
        status: 200,
        message: 'Ratings successfully retrieved',
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
      const ratingCheck = await this.ratingExist();

      if (ratingCheck.error) {
        const { message, stack } = ratingCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!ratingCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Rating not found',
          res: this.res,
        });
      }

      const rating = await Database.Rating.findOne({
        where: { id: this.dataId },
        include: [
          {
            model: Database.User,
            as: 'user',
            attributes: ['id', 'name', 'username'],
          },
          {
            model: Database.Profile,
            as: 'firm',
            attributes: ['id', 'name', 'userRole'],
            include: [
              {
                model: Database.User,
                as: 'user',
                attributes: ['id', 'email'],
              },
            ],
          },
        ],
      });

      return ResponseService({
        data: rating,
        status: 200,
        message: 'Rating successfully retrieved',
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
      const ratingCheck = await this.ratingExist();
      if (ratingCheck.error) {
        const { message, stack } = ratingCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }
      if (!ratingCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Rating not found',
          res: this.res,
        });
      }

      // Check if user owns this rating
      const existingRating = await Database.Rating.findOne({
        where: { id: this.dataId, userId: this.userId },
        raw: true,
      });
      if (!existingRating) {
        return ResponseService({
          data: null,
          status: 403,
          success: false,
          message: 'You can only update your own ratings',
          res: this.res,
        });
      }

      const updateData: UpdateRatingInterface = { ...this.data };

      const updatedRating = await Database.Rating.update(
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId } },
      );

      return ResponseService({
        data: updatedRating,
        success: true,
        status: 200,
        message: 'Rating successfully updated',
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
      const ratingCheck = await this.ratingExist();

      if (ratingCheck.error) {
        const { message, stack } = ratingCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!ratingCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Rating not found',
          res: this.res,
        });
      }

      // Check if user owns this rating
      const existingRating = await Database.Rating.findOne({
        where: { id: this.dataId, userId: this.userId },
        raw: true,
      });
      if (!existingRating) {
        return ResponseService({
          data: null,
          status: 403,
          success: false,
          message: 'You can only delete your own ratings',
          res: this.res,
        });
      }

      const deletedRating = await Database.Rating.destroy({ where: { id: this.dataId } });

      return ResponseService({
        data: deletedRating,
        success: true,
        status: 200,
        message: 'Rating successfully deleted',
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
