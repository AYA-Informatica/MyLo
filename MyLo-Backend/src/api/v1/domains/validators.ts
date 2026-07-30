import joi from 'joi';

export const createDomainSchema = joi.object({
  name: joi.string().min(2).max(100).required().messages({
    'string.empty': 'Domain name is required',
    'string.min': 'Domain name must be at least 2 characters long',
    'string.max': 'Domain name cannot exceed 100 characters',
    'any.required': 'Domain name is required',
  }),
  description: joi.string().min(10).max(1000).required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters long',
    'string.max': 'Description cannot exceed 1000 characters',
    'any.required': 'Description is required',
  }),
});

export const updateDomainSchema = joi.object({
  name: joi.string().min(2).max(100).optional().messages({
    'string.empty': 'Domain name cannot be empty',
    'string.min': 'Domain name must be at least 2 characters long',
    'string.max': 'Domain name cannot exceed 100 characters',
  }),
  description: joi.string().min(10).max(1000).optional().messages({
    'string.empty': 'Description cannot be empty',
    'string.min': 'Description must be at least 10 characters long',
    'string.max': 'Description cannot exceed 1000 characters',
  }),
});

export const IdValidationSchema = joi.object({
  id: joi.string().uuid().required().messages({
    'string.empty': 'Domain ID is required',
    'string.guid': 'Domain ID must be a valid UUID',
    'any.required': 'Domain ID is required',
  }),
});
