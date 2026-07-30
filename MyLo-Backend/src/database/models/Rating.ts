import { DataTypes, Sequelize, Model } from 'sequelize';
import { User } from './User';
import { Profile } from './Profile';

export interface RatingAttributes {
  id: string;
  star: number;
  review?: string;
  userId: string;
  firmId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RatingCreationAttributes
  extends Omit<RatingAttributes, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Rating
  extends Model<RatingAttributes, RatingCreationAttributes>
  implements RatingAttributes
{
  public id!: string;
  public star!: number;
  public review?: string;
  public userId!: string;
  public firmId!: string;
  public updatedAt!: Date;
  public createdAt!: Date;

  static associate(models: { User: typeof User; Profile: typeof Profile }): void {
    Rating.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    Rating.belongsTo(models.Profile, {
      foreignKey: 'firmId',
      as: 'firm',
    });
  }
  public toJSON(): object | RatingAttributes {
    return {
      ...this.get(),
    };
  }
}

export const RatingModel = (sequelize: Sequelize): typeof Rating => {
  Rating.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      star: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      review: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      firmId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'Rating',
      tableName: 'ratings',
      timestamps: true,
    },
  );

  return Rating;
};
