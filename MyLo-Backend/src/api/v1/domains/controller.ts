import { Response } from 'express';
import { DomainService } from './service';
import { DomainRequestInterface, UpdateDomainRequestInterface } from './domains';

export class DomainController {
  public async createDomain(req: DomainRequestInterface, res: Response): Promise<void> {
    try {
      const domainService = new DomainService(req.body, '', res);
      domainService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllDomains(req: DomainRequestInterface, res: Response): Promise<void> {
    try {
      const domainService = new DomainService(req.body, '', res);
      domainService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getDomain(req: DomainRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const domainService = new DomainService(req.body, id, res);
      domainService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateDomain(req: UpdateDomainRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const domainService = new DomainService(req.body, id, res);
      domainService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteDomain(req: DomainRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const domainService = new DomainService(req.body, id, res);
      domainService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}
