import { Response } from 'express';
import { DomainPreferenceService } from './service';
import {
  DomainPreferenceRequestInterface,
  UpdateDomainPreferenceRequestInterface,
} from './DomainPreferences';

export class DomainPreferenceController {
  public async createPreference(
    req: DomainPreferenceRequestInterface,
    res: Response,
  ): Promise<void> {
    try {
      const user = req.user?.id as string;
      const preferenceService = new DomainPreferenceService(req.body, '', user, res);
      preferenceService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllPreferences(
    req: DomainPreferenceRequestInterface,
    res: Response,
  ): Promise<void> {
    try {
      const user = req.user?.id as string;
      const preferenceService = new DomainPreferenceService(req.body, '', user, res);
      preferenceService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getPreference(
    req: DomainPreferenceRequestInterface,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user?.id as string;
      const preferenceService = new DomainPreferenceService(req.body, id, user, res);
      preferenceService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updatePreference(
    req: UpdateDomainPreferenceRequestInterface,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user?.id as string;
      const preferenceService = new DomainPreferenceService(req.body, id, user, res);
      preferenceService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deletePreference(
    req: DomainPreferenceRequestInterface,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user?.id as string;
      const preferenceService = new DomainPreferenceService(req.body, id, user, res);
      preferenceService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}
