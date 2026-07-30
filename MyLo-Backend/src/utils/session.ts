import expressSession from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize';
import { Database } from '../database';

const SequelizeStore = connectSessionSequelize(expressSession.Store);

const sessionStore = new SequelizeStore({
  db: Database.database,
  tableName: 'sessions',
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 7 * 24 * 60 * 60 * 1000,
});

sessionStore.sync();

export const sessionMiddleware = expressSession({
  secret: process.env.SESSION_SECRET as string,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
});
