import joi from 'joi';

export const createArticleSchema = joi.object({
  articleNumber: joi.string().min(1).max(100).required().messages({
    'string.empty': 'Article number is required',
    'string.min': 'Article number must be at least 1 character long',
    'string.max': 'Article number cannot exceed 100 characters',
    'any.required': 'Article number is required',
  }),
  title: joi.string().min(5).max(500).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 5 characters long',
    'string.max': 'Title cannot exceed 500 characters',
    'any.required': 'Title is required',
  }),
  content: joi.string().min(10).max(50000).required().messages({
    'string.empty': 'Content is required',
    'string.min': 'Content must be at least 10 characters long',
    'string.max': 'Content cannot exceed 50000 characters',
    'any.required': 'Content is required',
  }),
});

export const updateArticleSchema = joi.object({
  articleNumber: joi.string().min(1).max(100).optional().messages({
    'string.empty': 'Article number cannot be empty',
    'string.min': 'Article number must be at least 1 character long',
    'string.max': 'Article number cannot exceed 100 characters',
  }),
  title: joi.string().min(5).max(500).optional().messages({
    'string.empty': 'Title cannot be empty',
    'string.min': 'Title must be at least 5 characters long',
    'string.max': 'Title cannot exceed 500 characters',
  }),
  content: joi.string().min(10).max(50000).optional().messages({
    'string.empty': 'Content cannot be empty',
    'string.min': 'Content must be at least 10 characters long',
    'string.max': 'Content cannot exceed 50000 characters',
  }),
});

export const articleIdValidationSchema = joi.object({
  id: joi.string().uuid().required().messages({
    'string.empty': 'Article ID is required',
    'string.guid': 'Article ID must be a valid UUID',
    'any.required': 'Article ID is required',
  }),
  lawId: joi.string().uuid().required().messages({
    'string.empty': 'Law ID is required',
    'string.guid': 'Law ID must be a valid UUID',
    'any.required': 'Law ID is required',
  }),
});

export const lawIdValidationSchema = joi.object({
  lawId: joi.string().uuid().required().messages({
    'string.empty': 'Law ID is required',
    'string.guid': 'Law ID must be a valid UUID',
    'any.required': 'Law ID is required',
  }),
});