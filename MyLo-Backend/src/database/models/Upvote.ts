import { Sequelize, Model, DataTypes } from 'sequelize';
import { User } from './User';
import { Post } from './Post';

interface UpvoteAttributes {
  id: string;
  userId: string;
  postId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface UpvoteCreationAttributes extends Omit<UpvoteAttributes, 'id'> {
  id?: string;
}

export class Upvote
  extends Model<UpvoteAttributes, UpvoteCreationAttributes>
  implements UpvoteAttributes
{
  public id!: string;
  public userId!: string;
  public postId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models: { User: typeof User; Post: typeof Post }): void {
    Upvote.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    Upvote.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post',
    });
  }

  public toJSON(): object | UpvoteAttributes {
    return {
      ...this.get(),
    };
  }
}

export const UpvoteModel = (sequelize: Sequelize): typeof Upvote => {
  Upvote.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      postId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'posts',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      timestamps: false,
      modelName: 'Upvote',
      tableName: 'upvotes',
    },
  );

  return Upvote;
};
