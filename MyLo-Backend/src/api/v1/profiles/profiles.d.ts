import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  github?: string;
  facebook?: string;
  instagram?: string;
  website?: string;
}

export interface ProfileInterface {
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

export interface CreateCitizenProfile {
  name: string;
  occupation?: string;
  bio?: string;
  phoneNumber?: string;
  socials?: SocialLinks;
}

export interface CreateOrganizationProfile {
  name: string;
  bio?: string;
  website?: string;
  phoneNumber?: string;
  socials?: SocialLinks;
  teamSize?: number;
  yearsOfExperience?: number;
  establishedAt?: Date;
}

export interface CreateLawFirmProfile {
  name: string;
  bio?: string;
  website?: string;
  phoneNumber?: string;
  socials?: SocialLinks;
  teamSize?: number;
  yearsOfExperience?: number;
  caseResolved?: number;
  successRate?: number;
  establishedAt?: Date;
}

export type CreateProfileInterface =
  | CreateCitizenProfile
  | CreateOrganizationProfile
  | CreateLawFirmProfile;

export type UpdateCitizenProfile = Partial<CreateCitizenProfile>;
export type UpdateOrganizationProfile = Partial<CreateOrganizationProfile>;
export type UpdateLawFirmProfile = Partial<CreateLawFirmProfile>;

export type UpdateProfileInterface =
  | UpdateCitizenProfile
  | UpdateOrganizationProfile
  | UpdateLawFirmProfile;

export interface ProfileRequestInterface extends IRequestUser {
  body: CreateProfile;
  params: {
    id?: string;
  };
}

export interface UpdateProfileRequestInterface extends IRequestUser {
  body: UpdateProfile;
  params: {
    id: string;
  };
}

export interface ImageUploadRequest extends IRequestUser {
  file?: Express.Multer.File;
  params: {
    id: string;
  };
}

export interface GetAllProfiles{
  profiles:ProfileInterface[];
}