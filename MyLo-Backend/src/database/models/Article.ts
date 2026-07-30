import { Sequelize, Model, DataTypes } from 'sequelize';
import { Law } from './Law';

interface ArticleAttributes {
  id: string;
  lawId: string;
  articleNumber: string;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface ArticleCreationAttributes extends Omit<ArticleAttributes, 'id'> {
  id?: string;
}

export class Article
  extends Model<ArticleAttributes, ArticleCreationAttributes>
  implements ArticleAttributes
{
  public id!: string;
  public lawId!: string;
  public articleNumber!: string;
  public title!: string;
  public content!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models: { Law: typeof Law }): void {
    Article.belongsTo(models.Law, {
      foreignKey: 'lawId',
      as: 'law',
    });
  }

  public toJSON(): object | ArticleAttributes {
    return {
      ...this.get(),
    };
  }
}

export const ArticleModel = (sequelize: Sequelize): typeof Article => {
  Article.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      lawId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'laws',
          key: 'id',
        },
        validate: {
          notEmpty: {
            msg: 'Law ID cannot be empty',
          },
          isUUID: {
            args: 4,
            msg: 'Law ID must be a valid UUID',
          },
        },
      },
      articleNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Article number cannot be empty',
          },
          len: {
            args: [1, 100],
            msg: 'Article number must be between 1 and 100 characters',
          },
        },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Title cannot be empty',
          },
          len: {
            args: [5, 500],
            msg: 'Title must be between 5 and 500 characters',
          },
        },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Content cannot be empty',
          },
          len: {
            args: [10, 50000],
            msg: 'Content must be between 10 and 50000 characters',
          },
        },
      },
    },
    {
      sequelize,
      timestamps: true,
      paranoid: true,
      modelName: 'Article',
      tableName: 'articles',
      indexes: [
        {
          unique: true,
          fields: ['lawId', 'articleNumber'],
          name: 'articles_law_id_article_number_unique',
        },
        {
          fields: ['lawId'],
          name: 'articles_law_id_index',
        },
        {
          fields: ['articleNumber'],
          name: 'articles_article_number_index',
        },
        {
          fields: ['createdAt'],
          name: 'articles_created_at_index',
        },
      ],
    },
  );

  return Article;
};