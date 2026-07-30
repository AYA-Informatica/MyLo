import { Sequelize, Model, DataTypes } from 'sequelize';

export interface SubscriberAttributes {
  id: string;
  email: string;
  subscribed?: boolean;
}

export interface SubscriberCreationAttributes extends Omit<SubscriberAttributes, 'id'> {
  id?: string;
  subscribed?: boolean;
}

export class Subscriber
  extends Model<SubscriberAttributes, SubscriberCreationAttributes>
  implements SubscriberAttributes
{
  public id!: string;
  public email!: string;
  public subscribed!: boolean;

  public createdAt: Date = new Date();
  public updatedAt!: Date;
  public deletedAt: null = null;

  public toJSON(): object | SubscriberAttributes {
    return {
      ...this.get(),
      updatedAt: undefined,
      deletedAt: undefined,
    };
  }
}

export const SubscriberModel = (sequelize: Sequelize): typeof Subscriber => {
  Subscriber.init(
    {
      id: {
        allowNull: false,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
      },
      subscribed: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      timestamps: true,
      paranoid: true,
      modelName: 'Subscriber',
      tableName: 'subscribers',
    },
  );

  return Subscriber;
};
