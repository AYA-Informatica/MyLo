import { Sequelize, Model, DataTypes } from 'sequelize';
import { User } from './User';
import { Rating } from './Rating';

interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  github?: string;
  facebook?: string;
  instagram?: string;
  website?: string;
}

interface ProfileAttributes {
  id: string;
  userId: string;
  userRole: 'citizen' | 'organization' | 'law-firm';
  name: string;
  bio?: string;
  occupation?: string;
  imageUrl?: string;
  website?: string;
  phoneNumber?: string;
  socials?: SocialLinks;
  teamSize?: number;
  yearsOfExperience?: number;
  caseResolved?: number;
  successRate?: number;
  establishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ProfileCreationAttributes
  extends Omit<ProfileAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class Profile
  extends Model<ProfileAttributes, ProfileCreationAttributes>
  implements ProfileAttributes
{
  public id!: string;
  public userId!: string;
  public userRole!: 'citizen' | 'organization' | 'law-firm';
  public name!: string;
  public bio?: string;
  public occupation?: string;
  public imageUrl?: string;
  public website?: string;
  public phoneNumber?: string;
  public socials?: SocialLinks;
  public teamSize?: number;
  public yearsOfExperience?: number;
  public caseResolved?: number;
  public successRate?: number;
  public establishedAt?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt?: Date | null;

  static associate(models: {
    User: typeof User;
    Rating: typeof Rating;
  }): void {
    Profile.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    Profile.hasMany(models.Rating, {
      foreignKey: 'firmId',
      as: 'ratings',
    });
  }

  public toJSON(): Partial<ProfileAttributes> {
    const values = { ...this.get() } as ProfileAttributes;
    delete values.deletedAt;
    return values;
  }
}

export const ProfileModel = (sequelize: Sequelize): typeof Profile => {
  Profile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userRole: {
        type: DataTypes.ENUM('citizen', 'organization', 'law-firm'),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      occupation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      socials: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      teamSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      yearsOfExperience: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      caseResolved: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      successRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      establishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Profile',
      tableName: 'profiles',
      timestamps: true,
      paranoid: true,
    },
  );
  return Profile;
};