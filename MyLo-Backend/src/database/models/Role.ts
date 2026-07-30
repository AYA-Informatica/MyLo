import { Sequelize, Model, DataTypes } from 'sequelize';
import { User } from './User';

export interface RoleAttributes {
  id: string;
  name: string;
  permissions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt: null;
}

export interface RoleCreationAttributes
  extends Omit<RoleAttributes, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}

export class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: string;
  public name!: string;
  public permissions?: string[];
  public createdAt: Date = new Date();
  public updatedAt?: Date;
  public deletedAt: null = null;

  static associate(models: { User: typeof User }): void {
    Role.hasMany(models.User, {
      foreignKey: 'roleId',
      as: 'users',
    });
  }

  public toJSON(): object | RoleAttributes {
    return {
      ...this.get(),
    };
  }
}

export const RoleModel = (sequelize: Sequelize): typeof Role => {
  Role.init(
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
      },
      permissions: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      deletedAt: {
        allowNull: true,
        type: DataTypes.DATE,
        defaultValue: null,
      },
    },
    {
      sequelize,
      timestamps: true,
      modelName: 'Role',
      tableName: 'roles',
      paranoid: true,
    },
  );

  return Role;
};
