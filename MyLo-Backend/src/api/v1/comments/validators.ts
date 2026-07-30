import joi from 'joi';

export const createCommentSchema = joi.object({
  content: joi.string().required(),
});

export const updateCommentSchema = joi.object({
  content: joi.string().optional(),
});

export const IdValidationSchema = joi.object({
  id: joi.string().uuid().required(),
  postId: joi.string().uuid().required(),
});

export const postIdValidationSchema = joi.object({
  postId: joi.string().uuid().required(),
});
