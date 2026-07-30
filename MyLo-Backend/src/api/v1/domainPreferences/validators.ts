import joi from 'joi';

export const createProfileDomainPreferenceSchema = joi.object({
  domainId: joi.string().uuid().required().messages({
    'string.empty': 'Domain ID is required',
    'string.guid': 'Domain ID must be a valid UUID',
    'any.required': 'Domain ID is required',
  }),
});

export const updateProfileDomainPreferenceSchema = joi.object({
  domainId: joi.string().uuid().optional().messages({
    'string.empty': 'Domain ID cannot be empty',
    'string.guid': 'Domain ID must be a valid UUID',
  }),
});

export const IdValidationSchema = joi.object({
  id: joi.string().uuid().required().messages({
    'string.empty': 'Preference ID is required',
    'string.guid': 'Preference ID must be a valid UUID',
    'any.required': 'Preference ID is required',
  }),
});