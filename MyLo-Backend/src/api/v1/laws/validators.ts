import joi from 'joi';

export const createLawSchema = joi.object({
  lawNumber: joi.string().min(1).max(100).required().messages({
    'string.empty': 'Law number is required',
    'string.min': 'Law number must be at least 1 character long',
    'string.max': 'Law number cannot exceed 100 characters',
    'any.required': 'Law number is required',
  }),
  title: joi.string().min(5).max(500).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 5 characters long',
    'string.max': 'Title cannot exceed 500 characters',
    'any.required': 'Title is required',
  }),
  description: joi.string().min(10).max(10000).required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters long',
    'string.max': 'Description cannot exceed 10000 characters',
    'any.required': 'Description is required',
  }),
  publishedAt: joi.date().iso().required().messages({
    'date.base': 'Published date must be a valid date',
    'date.format': 'Published date must be in ISO format',
    'any.required': 'Published date is required',
  }),
  originId: joi.string().uuid().required().messages({
    'string.empty': 'Origin ID is required',
    'string.guid': 'Origin ID must be a valid UUID',
    'any.required': 'Origin ID is required',
  }),
  domainId: joi.string().uuid().required().messages({
    'string.empty': 'Domain ID is required',
    'string.guid': 'Domain ID must be a valid UUID',
    'any.required': 'Domain ID is required',
  }),
  status: joi.string().valid('Active', 'Amended', 'Repealed').optional().messages({
    'any.only': 'Status must be one of: Active, Amended, Repealed',
  }),
  language: joi.string().valid('EN', 'RW', 'FR').optional().messages({
    'any.only': 'Language must be one of: EN, RW, FR',
  }),
  tags: joi.array().items(joi.string()).optional().messages({
    'array.base': 'Tags must be an array of strings',
  }),
});

export const updateLawSchema = joi.object({
  lawNumber: joi.string().min(1).max(100).optional().messages({
    'string.empty': 'Law number cannot be empty',
    'string.min': 'Law number must be at least 1 character long',
    'string.max': 'Law number cannot exceed 100 characters',
  }),
  title: joi.string().min(5).max(500).optional().messages({
    'string.empty': 'Title cannot be empty',
    'string.min': 'Title must be at least 5 characters long',
    'string.max': 'Title cannot exceed 500 characters',
  }),
  description: joi.string().min(10).max(10000).optional().messages({
    'string.empty': 'Description cannot be empty',
    'string.min': 'Description must be at least 10 characters long',
    'string.max': 'Description cannot exceed 10000 characters',
  }),
  publishedAt: joi.date().iso().optional().messages({
    'date.base': 'Published date must be a valid date',
    'date.format': 'Published date must be in ISO format',
  }),
  originId: joi.string().uuid().optional().messages({
    'string.empty': 'Origin ID cannot be empty',
    'string.guid': 'Origin ID must be a valid UUID',
  }),
  domainId: joi.string().uuid().optional().messages({
    'string.empty': 'Domain ID cannot be empty',
    'string.guid': 'Domain ID must be a valid UUID',
  }),
  status: joi.string().valid('Active', 'Amended', 'Repealed').optional().messages({
    'any.only': 'Status must be one of: Active, Amended, Repealed',
  }),
  language: joi.string().valid('EN', 'RW', 'FR').optional().messages({
    'any.only': 'Language must be one of: EN, RW, FR',
  }),
  tags: joi.array().items(joi.string()).optional().messages({
    'array.base': 'Tags must be an array of strings',
  }),
});

export const IdValidationSchema = joi.object({
  id: joi.string().uuid().required().messages({
    'string.empty': 'Law ID is required',
    'string.guid': 'Law ID must be a valid UUID',
    'any.required': 'Law ID is required',
  }),
});