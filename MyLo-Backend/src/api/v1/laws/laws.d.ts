import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

type LawStatus = 'Active' | 'Amended' | 'Repealed';
type LawLanguage = 'EN' | 'RW' | 'FR';

interface LawInterface {
  id: string;
  lawNumber: string;
  title: string;
  description: string;
  publishedAt: Date;
  originId: string;
  domainId: string;
  status: LawStatus;
  language: LawLanguage;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type CreateLawInterface = Omit<LawInterface, 'id' | 'deletedAt'>;
type UpdateLawInterface = Partial<Omit<LawInterface, 'id' | 'createdAt'>>;

interface LawRequestInterface extends IRequestUser {
  body: CreateLawInterface;
  params: {
    id: string;
  };
  query: {
    domainId?: string;
    originId?: string;
    status?: LawStatus;
    language?: LawLanguage;
  };
}

interface UpdateLawRequestInterface extends IRequestUser {
  body: UpdateLawInterface;
  params: {
    id: string;
  };
}

interface GetAllLaws {
  laws: LawInterface[];
}

export {
  LawInterface,
  CreateLawInterface,
  UpdateLawInterface,
  LawRequestInterface,
  UpdateLawRequestInterface,
  GetAllLaws,
  LawStatus,
  LawLanguage,
};