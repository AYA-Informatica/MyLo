import { Sequelize, Model, DataTypes } from 'sequelize';
import { User } from './User';
import { Comment } from './Comment';
import { Upvote } from './Upvote';

interface PostAttributes {
  id: string;
  title?: string;
  slug?: string;
  content: string;
  image_url?: string;
  authorId: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt: Date | null;
}

export interface PostCreationAttributes extends Omit<PostAttributes, 'id'> {
  id?: string;
}

export class Post extends Model<PostAttributes, PostCreationAttributes> implements PostAttributes {
  public id!: string;
  public title?: string;
  public slug?: string;
  public content!: string;
  public image_url?: string;
  public authorId!: string;
  public isPublished!: boolean;

  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;

  static associate(models: {
    User: typeof User;
    Comment: typeof Comment;
    Upvote: typeof Upvote;
  }): void {
    Post.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author',
    });

    Post.hasMany(models.Comment, {
      foreignKey: 'postId',
      as: 'comments',
    });

    Post.hasMany(models.Upvote, {
      foreignKey: 'postId',
      as: 'upvotes',
    });
  }

  public toJSON(): object | PostAttributes {
    return {
      ...this.get(),
    };
  }
}

export const PostModel = (sequelize: Sequelize): typeof Post => {
  Post.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      authorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      deletedAt: {
        type: DataTypes.DATE,
        defaultValue: null,
      },
    },
    {
      sequelize,
      timestamps: true,
      paranoid: true,
      modelName: 'Post',
      tableName: 'posts',
    },
  );

  return Post;
};
