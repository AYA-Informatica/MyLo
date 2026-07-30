import { Response } from 'express';
import { RatingService } from './service';
import { RatingRequestInterface, UpdateRatingRequestInterface } from './ratings';

export class RatingController {
  public async createRating(req: RatingRequestInterface, res: Response): Promise<void> {
    try {
      const { id, firmId } = req.params;
      const user = req?.user?.id as string;
      const ratingService = new RatingService(req.body, user, id, firmId || '', res);
      ratingService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllRatings(req: RatingRequestInterface, res: Response): Promise<void> {
    try {
      const { id, firmId } = req.params;
      const user = req?.user?.id as string;
      const ratingService = new RatingService(req.body, user, id, firmId || '', res);
      ratingService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getARating(req: RatingRequestInterface, res: Response): Promise<void> {
    try {
      const { id, firmId } = req.params;
      const user = req?.user?.id as string;
      const ratingService = new RatingService(req.body, user, id, firmId || '', res);
      ratingService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateRating(req: UpdateRatingRequestInterface, res: Response): Promise<void> {
    try {
      const { id, firmId } = req.params;
      const user = req?.user?.id as string;
      const ratingService = new RatingService(req.body, user, id, firmId || '', res);
      ratingService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteRating(req: RatingRequestInterface, res: Response): Promise<void> {
    try {
      const { id, firmId } = req.params;
      const user = req?.user?.id as string;
      const ratingService = new RatingService(req.body, user, id, firmId || '', res);
      ratingService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}
