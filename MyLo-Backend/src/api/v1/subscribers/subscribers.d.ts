import { Request } from 'express';

interface SubscriberInterface {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
interface RequestSubscriberInterface extends Request {
  body: {
    email: string;
  };
}
