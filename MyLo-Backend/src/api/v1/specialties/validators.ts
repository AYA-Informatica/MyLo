import joi from 'joi';

export const createSpecialtySchema = joi.object({
  domainId: joi.string().uuid().required().messages({
    'string.empty': 'Domain ID is required',
    'string.guid': 'Domain ID must be a valid UUID',
    'any.required': 'Domain ID is required',
  }),
});

export const updateSpecialtySchema = joi.object({
  domainId: joi.string().uuid().optional().messages({
    'string.empty': 'Domain ID cannot be empty',
    'string.guid': 'Domain ID must be a valid UUID',
  }),
});

export const IdValidationSchema = joi.object({
  id: joi.string().uuid().required().messages({
    'string.empty': 'Specialty ID is required',
    'string.guid': 'Specialty ID must be a valid UUID',
    'any.required': 'Specialty ID is required',
  }),
});