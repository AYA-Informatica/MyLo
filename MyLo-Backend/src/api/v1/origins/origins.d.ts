import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

interface OriginInterface {
  id: string;
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type CreateOriginInterface = Omit<OriginInterface, 'id' | 'deletedAt'>;
type UpdateOriginInterface = Partial<Omit<OriginInterface, 'id' | 'createdAt'>>;

interface OriginRequestInterface extends IRequestUser {
  body: CreateOriginInterface;
  params: {
    id: string;
  };
}

interface UpdateOriginRequestInterface extends IRequestUser {
  body: UpdateOriginInterface;
  params: {
    id: string;
  };
}

interface GetAllOrigins {
  origins: OriginInterface[];
}

export {
  OriginInterface,
  CreateOriginInterface,
  UpdateOriginInterface,
  OriginRequestInterface,
  UpdateOriginRequestInterface,
  GetAllOrigins,
};
