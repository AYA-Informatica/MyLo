import { Sequelize, Model, DataTypes } from 'sequelize';
import { Law } from './Law';

interface OriginAttributes {
  id: string;
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface OriginCreationAttributes extends Omit<OriginAttributes, 'id'> {
  id?: string;
}

export class Origin
  extends Model<OriginAttributes, OriginCreationAttributes>
  implements OriginAttributes
{
  public id!: string;
  public name!: string;
  public description!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models:{ Law: typeof Law}): void {
    Origin.hasMany(models.Law, {
      foreignKey: 'originId',
      as: 'law',
    });
  }

  public toJSON(): object | OriginAttributes {
    return {
      ...this.get(),
    };
  }
}

export const OriginModel = (sequelize: Sequelize): typeof Origin => {
  Origin.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: 'Origin name cannot be empty',
          },
          len: {
            args: [2, 100],
            msg: 'Origin name must be between 2 and 100 characters',
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
            args: [10, 1000],
            msg: 'Description must be between 10 and 1000 characters',
          },
        },
      },
    },
    {
      sequelize,
      timestamps: true,
      paranoid: true,
      modelName: 'Origin',
      tableName: 'origins',
    },
  );

  return Origin;
};
