import joi from 'joi';

export const createOriginSchema = joi.object({
  name: joi.string().min(2).max(100).required().messages({
    'string.empty': 'Origin name is required',
    'string.min': 'Origin name must be at least 2 characters long',
    'string.max': 'Origin name cannot exceed 100 characters',
    'any.required': 'Origin name is required',
  }),
  description: joi.string().min(10).max(1000).required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters long',
    'string.max': 'Description cannot exceed 1000 characters',
    'any.required': 'Description is required',
  }),
});

export const updateOriginSchema = joi.object({
  name: joi.string().min(2).max(100).optional().messages({
    'string.empty': 'Origin name cannot be empty',
    'string.min': 'Origin name must be at least 2 characters long',
    'string.max': 'Origin name cannot exceed 100 characters',
  }),
  description: joi.string().min(10).max(1000).optional().messages({
    'string.empty': 'Description cannot be empty',
    'string.min': 'Description must be at least 10 characters long',
    'string.max': 'Description cannot exceed 1000 characters',
  }),
});

export const IdValidationSchema = joi.object({
  id: joi.string().uuid().required().messages({
    'string.empty': 'Origin ID is required',
    'string.guid': 'Origin ID must be a valid UUID',
    'any.required': 'Origin ID is required',
  }),
});
