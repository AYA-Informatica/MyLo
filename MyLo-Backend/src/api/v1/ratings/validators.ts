import joi from 'joi';

export const createRatingSchema = joi.object({
  star: joi.number().integer().min(1).max(5).required(),
  review: joi.string().optional(),
  firmId: joi.string().uuid().required(),
});

export const updateRatingSchema = joi.object({
  star: joi.number().integer().min(1).max(5).optional(),
  review: joi.string().optional(),
});

export const IdValidationSchema = joi.object({
  id: joi.string().uuid().required(),
});

export const firmIdValidationSchema = joi.object({
  firmId: joi.string().uuid().required(),
});
