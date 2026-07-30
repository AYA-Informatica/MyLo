import { Sequelize, Model, DataTypes } from 'sequelize';
import { User } from './User';
import { Domain } from './Domain';

interface DomainPreferenceAttributes {
  id: string;
  userId: string;
  domainId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface DomainPreferenceCreationAttributes 
  extends Omit<DomainPreferenceAttributes, 'id'> {
  id?: string;
}

export class DomainPreference
  extends Model<DomainPreferenceAttributes, DomainPreferenceCreationAttributes>
  implements DomainPreferenceAttributes
{
  public id!: string;
  public userId!: string;
  public domainId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models: { User: typeof User; Domain: typeof Domain }): void {
    DomainPreference.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    DomainPreference.belongsTo(models.Domain, {
      foreignKey: 'domainId',
      as: 'domain',
    });
  }

  public toJSON(): object | DomainPreferenceAttributes {
    return {
      ...this.get(),
    };
  }
}

export const DomainPreferenceModel = (sequelize: Sequelize): typeof DomainPreference => {
  DomainPreference.init(
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
        validate: {
          notEmpty: {
            msg: 'User ID cannot be empty',
          },
          isUUID: {
            args: 4,
            msg: 'User ID must be a valid UUID',
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
      modelName: 'DomainPreference',
      tableName: 'domain_preferences',
      indexes: [
        {
          unique: true,
          fields: ['userId', 'domainId'],
          name: 'unique_domain_preference',
        },
      ],
    },
  );

  return DomainPreference;
};