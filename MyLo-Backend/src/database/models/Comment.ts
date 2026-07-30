import { Sequelize, Model, DataTypes } from 'sequelize';
import { User } from './User';
import { Post } from './Post';
import { Reply } from './Reply';

interface CommentAttributes {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface CommentCreationAttributes extends Omit<CommentAttributes, 'id'> {
  id?: string;
}

export class Comment
  extends Model<CommentAttributes, CommentCreationAttributes>
  implements CommentAttributes
{
  public id!: string;
  public content!: string;
  public authorId!: string;
  public postId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models: { User: typeof User; Post: typeof Post; Reply: typeof Reply }): void {
    Comment.hasMany(models.Reply, {
      foreignKey: 'commentId',
      as: 'replies',
    });

    Comment.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author',
    });

    Comment.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post',
    });
  }

  public toJSON(): object | CommentAttributes {
    return {
      ...this.get(),
    };
  }
}

export const CommentModel = (sequelize: Sequelize): typeof Comment => {
  Comment.init(
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
      timestamps: true,
      paranoid: true,
      modelName: 'Comment',
      tableName: 'comments',
    },
  );

  return Comment;
};
