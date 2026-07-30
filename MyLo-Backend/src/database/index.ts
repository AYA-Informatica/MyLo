import { Sequelize } from 'sequelize';
import databaseConfig from './config/config';
import { AllModels } from './models';

interface ConfigInterface {
  username: string;
  password: string;
  database: string;
  port: number;
  host: string;
  dialect: string;
  ssl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dialectOptions?: any;
}

const dbConnection = (): Sequelize => {
  const db_config = databaseConfig as ConfigInterface;
  const sequelize = new Sequelize(db_config.database, db_config.username, db_config.password, {
    host: db_config.host,
    port: db_config.port,
    dialect: 'postgres',
    dialectOptions: db_config.dialectOptions,
    logging: false,
  });
  return sequelize;
};

const sequelizeInstance = dbConnection();
const models = AllModels(sequelizeInstance);

Object.values(models).forEach((model) => {
  if (model?.associate) {
    model.associate(models);
  }
});

export const Database = {
  ...models,
  database: sequelizeInstance,
};
