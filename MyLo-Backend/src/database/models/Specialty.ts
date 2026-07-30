import { Sequelize, Model, DataTypes } from 'sequelize';
import { User } from './User';
import { Domain } from './Domain';

interface SpecialtyAttributes {
  id: string;
  firmId: string;
  domainId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface SpecialtyCreationAttributes extends Omit<SpecialtyAttributes, 'id'> {
  id?: string;
}

export class Specialty
  extends Model<SpecialtyAttributes, SpecialtyCreationAttributes>
  implements SpecialtyAttributes
{
  public id!: string;
  public firmId!: string;
  public domainId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models: { User: typeof User; Domain: typeof Domain }): void {
    Specialty.belongsTo(models.User, {
      foreignKey: 'firmId',
      as: 'firm',
    });

    Specialty.belongsTo(models.Domain, {
      foreignKey: 'domainId',
      as: 'domain',
    });
  }

  public toJSON(): object | SpecialtyAttributes {
    return {
      ...this.get(),
    };
  }
}

export const SpecialtyModel = (sequelize: Sequelize): typeof Specialty => {
  Specialty.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      firmId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        validate: {
          notEmpty: {
            msg: 'Firm ID cannot be empty',
          },
          isUUID: {
            args: 4,
            msg: 'Firm ID must be a valid UUID',
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
    },
    {
      sequelize,
      timestamps: true,
      paranoid: true,
      modelName: 'Specialty',
      tableName: 'specialties',
    },
  );

  return Specialty;
};