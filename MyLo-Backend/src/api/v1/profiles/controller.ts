import { Response } from 'express';
import { ProfileService } from './service';
import { ProfileRequestInterface, UpdateProfileRequestInterface } from './profiles';

export class ProfileController {
  public async createProfile(req: ProfileRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllProfiles(req: ProfileRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllCitizenProfiles(req: ProfileRequestInterface, res: Response): Promise<void> {
    try {
     const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.findCitizenProfiles();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllOrganizationProfiles(
    req: ProfileRequestInterface,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.findOrganizationProfiles();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllLawFirmProfiles(req: ProfileRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.findLawFirmProfiles();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAProfile(req: ProfileRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateProfile(req: UpdateProfileRequestInterface, res: Response): Promise<void> {
    try {
     const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteProfile(req: ProfileRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.delete();
    } catch (error) {
      throw error as Error;
    }
  }

  public async uploadProfileImage(req: ProfileRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.uploadImage();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteProfileImage(req: ProfileRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const role = req?.user?.role as 'citizen' | 'organization' | 'law-firm';
      const { file } = req;
      const profileService = new ProfileService(
        req.body,
        user,
        role,
        id as string,
        file as Express.Multer.File,
        res,
      );
      profileService.deleteImage();
    } catch (error) {
      throw error as Error;
    }
  }
}