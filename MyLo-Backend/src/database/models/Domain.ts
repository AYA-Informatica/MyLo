import { Sequelize, Model, DataTypes } from 'sequelize';
import { Specialty } from './Specialty';
import { DomainPreference } from './DomainPreference';
import { Law } from './Law';

interface DomainAttributes {
  id: string;
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface DomainCreationAttributes extends Omit<DomainAttributes, 'id'> {
  id?: string;
}

export class Domain
  extends Model<DomainAttributes, DomainCreationAttributes>
  implements DomainAttributes
{
  public id!: string;
  public name!: string;
  public description!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models: {
    Specialty: typeof Specialty;
    DomainPreference: typeof DomainPreference;
    Law: typeof Law;
  }): void {
    Domain.hasMany(models.Specialty, {
      foreignKey: 'domainId',
      as: 'specialty',
    });

    Domain.hasMany(models.DomainPreference, {
      foreignKey: 'domainId',
      as: 'domainPreferences',
    });

    Domain.hasMany(models.Law,{
      foreignKey:'domainId',
      as: 'law',
    });

  }

  public toJSON(): object | DomainAttributes {
    return {
      ...this.get(),
    };
  }
}

export const DomainModel = (sequelize: Sequelize): typeof Domain => {
  Domain.init(
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
            msg: 'Domain name cannot be empty',
          },
          len: {
            args: [2, 100],
            msg: 'Domain name must be between 2 and 100 characters',
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
      modelName: 'Domain',
      tableName: 'domains',
      indexes: [
        {
          unique: true,
          fields: ['firmId', 'domainId'],
          name: 'unique_firm_domain_specialty',
        },
      ],
    },
  );

  return Domain;
};
