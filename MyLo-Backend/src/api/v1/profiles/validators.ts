import joi from 'joi';

const socialLinksSchema = joi.object({
  linkedin: joi.string().uri().optional(),
  twitter: joi.string().uri().optional(),
  github: joi.string().uri().optional(),
  facebook: joi.string().uri().optional(),
  instagram: joi.string().uri().optional(),
  website: joi.string().uri().optional(),
}).optional();

export const createCitizenProfileSchema = joi.object({
  name: joi.string().min(2).max(255).required(),
  occupation: joi.string().max(255).optional(),
  bio: joi.string().max(5000).optional(),
  phoneNumber: joi
    .string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .max(20)
    .optional(),
  socials: socialLinksSchema,
});

export const createOrganizationProfileSchema = joi.object({
  name: joi.string().min(2).max(255).required(),
  bio: joi.string().max(5000).optional(),
  website: joi.string().uri().optional(),
  phoneNumber: joi
    .string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .max(20)
    .optional(),
  socials: socialLinksSchema,
  teamSize: joi.number().integer().min(1).optional(),
  yearsOfExperience: joi.number().integer().min(0).max(200).optional(),
  establishedAt: joi.date().max('now').optional(),
});

export const createLawFirmProfileSchema = joi.object({
  name: joi.string().min(2).max(255).required(),
  bio: joi.string().max(5000).optional(),
  website: joi.string().uri().optional(),
  phoneNumber: joi
    .string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .max(20)
    .optional(),
  socials: socialLinksSchema,
  teamSize: joi.number().integer().min(1).optional(),
  yearsOfExperience: joi.number().integer().min(0).max(200).optional(),
  caseResolved: joi.number().integer().min(0).optional(),
  successRate: joi.number().min(0).max(100).precision(2).optional(),
  establishedAt: joi.date().max('now').optional(),
});

export const updateCitizenProfileSchema = joi.object({
  name: joi.string().min(2).max(255).optional(),
  occupation: joi.string().max(255).optional(),
  bio: joi.string().max(5000).optional(),
  phoneNumber: joi
    .string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .max(20)
    .optional(),
  socials: socialLinksSchema,
});

export const updateOrganizationProfileSchema = joi.object({
  name: joi.string().min(2).max(255).optional(),
  bio: joi.string().max(5000).optional(),
  website: joi.string().uri().optional(),
  phoneNumber: joi
    .string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .max(20)
    .optional(),
  socials: socialLinksSchema,
  teamSize: joi.number().integer().min(1).optional(),
  yearsOfExperience: joi.number().integer().min(0).max(200).optional(),
  establishedAt: joi.date().max('now').optional(),
});

export const updateLawFirmProfileSchema = joi.object({
  name: joi.string().min(2).max(255).optional(),
  bio: joi.string().max(5000).optional(),
  website: joi.string().uri().optional(),
  phoneNumber: joi
    .string()
    .pattern(/^\+?[\d\s\-()]+$/)
    .max(20)
    .optional(),
  socials: socialLinksSchema,
  teamSize: joi.number().integer().min(1).optional(),
  yearsOfExperience: joi.number().integer().min(0).max(200).optional(),
  caseResolved: joi.number().integer().min(0).optional(),
  successRate: joi.number().min(0).max(100).precision(2).optional(),
  establishedAt: joi.date().max('now').optional(),
});

export const IdValidationSchema = joi.object({
  id: joi.string().uuid().required(),
});