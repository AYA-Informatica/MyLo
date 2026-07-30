/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const dotenv = require('dotenv');
dotenv.config();

const env = process.env.NODE_ENV || 'production';
const databaseConfig = {
  dialect: 'postgres',
};

if (env === 'development') {
  Object.assign(databaseConfig, {
    username: process.env.DEV_USERNAME,
    database: process.env.DEV_DATABASE,
    password: process.env.DEV_PASSWORD,
    host: process.env.DEV_HOST,
    port: process.env.DEV_PORT || 5432,
    dialect: 'postgres',
    ssl: process.env.DEV_SSLMODE,
    dialectOptions: {
      ssl:
        process.env.DEV_SSLMODE === 'true'
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
  });
} else if (env === 'test') {
  Object.assign(databaseConfig, {
    username: process.env.TEST_USERNAME,
    database: process.env.TEST_DATABASE,
    password: process.env.TEST_PASSWORD,
    host: process.env.TEST_HOST,
    port: process.env.TEST_PORT || 5432,
    dialect: 'postgres',
    ssl: process.env.TEST_SSLMODE,
    dialectOptions: {
      ssl:
        process.env.TEST_SSLMODE === 'true'
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
  });
} else if (env === 'production') {
  const { PROD_HOST, PROD_DATABASE, PROD_USERNAME, PROD_PASSWORD, PROD_PORT, PROD_SSLMODE } =
    process.env;

  Object.assign(databaseConfig, {
    username: PROD_USERNAME,
    password: PROD_PASSWORD,
    database: PROD_DATABASE,
    host: PROD_HOST,
    port: parseInt(PROD_PORT) || 5432,
    ssl: PROD_SSLMODE === 'true',
    dialectOptions: {
      ssl:
        PROD_SSLMODE === 'true'
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
  });
}

module.exports = databaseConfig;
