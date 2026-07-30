import { Sequelize, Model, DataTypes } from 'sequelize';
import { Origin } from './Origin';
import { Domain } from './Domain';

type LawStatus = 'Active' | 'Amended' | 'Repealed';
type LawLanguage = 'EN' | 'RW' | 'FR';

interface LawAttributes {
  id: string;
  lawNumber: string;
  title: string;
  description: string;
  publishedAt: Date;
  originId: string;
  domainId: string;
  status: LawStatus;
  language: LawLanguage;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface LawCreationAttributes extends Omit<LawAttributes, 'id'> {
  id?: string;
}

export class Law
  extends Model<LawAttributes, LawCreationAttributes>
  implements LawAttributes
{
  public id!: string;
  public lawNumber!: string;
  public title!: string;
  public description!: string;
  public publishedAt!: Date;
  public originId!: string;
  public domainId!: string;
  public status!: LawStatus;
  public language!: LawLanguage;
  public tags!: string[];
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models: { Origin: typeof Origin; Domain: typeof Domain }): void {
    Law.belongsTo(models.Origin, {
      foreignKey: 'originId',
      as: 'origin',
    });

    Law.belongsTo(models.Domain, {
      foreignKey: 'domainId',
      as: 'domain',
    });
  }

  public toJSON(): object | LawAttributes {
    return {
      ...this.get(),
    };
  }
}

export const LawModel = (sequelize: Sequelize): typeof Law => {
  Law.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      lawNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: 'Law number cannot be empty',
          },
          len: {
            args: [1, 100],
            msg: 'Law number must be between 1 and 100 characters',
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
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Description cannot be empty',
          },
          len: {
            args: [10, 10000],
            msg: 'Description must be between 10 and 10000 characters',
          },
        },
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: {
            args: true,
            msg: 'Published date must be a valid date',
          },
        },
      },
      originId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'origins',
          key: 'id',
        },
        validate: {
          notEmpty: {
            msg: 'Origin ID cannot be empty',
          },
          isUUID: {
            args: 4,
            msg: 'Origin ID must be a valid UUID',
          },
        },
      },
      domainId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'domains',
          key: 'id',
        },
        validate: {
          notEmpty: {
            msg: 'Domain ID cannot be empty',
          },
          isUUID: {
            args: 4,
            msg: 'Domain ID must be a valid UUID',
          },
        },
      },
      status: {
        type: DataTypes.ENUM('Active', 'Amended', 'Repealed'),
        allowNull: false,
        defaultValue: 'Active',
        validate: {
          isIn: {
            args: [['Active', 'Amended', 'Repealed']],
            msg: 'Status must be Active, Amended, or Repealed',
          },
        },
      },
      language: {
        type: DataTypes.ENUM('EN', 'RW', 'FR'),
        allowNull: false,
        defaultValue: 'EN',
        validate: {
          isIn: {
            args: [['EN', 'RW', 'FR']],
            msg: 'Language must be EN, RW, or FR',
          },
        },
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        get() {
          const rawValue = this.getDataValue('tags');
          return rawValue || [];
        },
      },
    },
    {
      sequelize,
      timestamps: true,
      paranoid: true,
      modelName: 'Law',
      tableName: 'laws',
      indexes: [
        {
          unique: true,
          fields: ['lawNumber'],
          name: 'laws_law_number_unique',
        },
        {
          fields: ['originId'],
          name: 'laws_origin_id_index',
        },
        {
          fields: ['domainId'],
          name: 'laws_domain_id_index',
        },
        {
          fields: ['status'],
          name: 'laws_status_index',
        },
        {
          fields: ['language'],
          name: 'laws_language_index',
        },
        {
          fields: ['publishedAt'],
          name: 'laws_published_at_index',
        },
        {
          fields: ['createdAt'],
          name: 'laws_created_at_index',
        },
      ],
    },
  );

  return Law;
};