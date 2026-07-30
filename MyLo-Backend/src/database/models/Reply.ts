import { Sequelize, Model, DataTypes } from 'sequelize';
import { User } from './User';
import { Comment } from './Comment';

interface ReplyAttributes {
  id: string;
  content: string;
  authorId: string;
  commentId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface ReplyCreationAttributes extends Omit<ReplyAttributes, 'id'> {
  id?: string;
}

export class Reply
  extends Model<ReplyAttributes, ReplyCreationAttributes>
  implements ReplyAttributes
{
  public id!: string;
  public content!: string;
  public authorId!: string;
  public commentId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models: { User: typeof User; Comment: typeof Comment }): void {
    Reply.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author',
    });

    Reply.belongsTo(models.Comment, {
      foreignKey: 'commentId',
      as: 'comment',
    });
  }

  public toJSON(): object | ReplyAttributes {
    return {
      ...this.get(),
    };
  }
}

export const ReplyModel = (sequelize: Sequelize): typeof Reply => {
  Reply.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      authorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      commentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'comments',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      timestamps: true,
      paranoid: true,
      modelName: 'Reply',
      tableName: 'replies',
    },
  );

  return Reply;
};
