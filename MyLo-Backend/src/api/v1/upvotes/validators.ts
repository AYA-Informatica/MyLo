import joi from 'joi';

export const upvoteParamsValidationSchema = joi.object({
  postId: joi.string().uuid().required(),
  upvoteId: joi.string().uuid().required(),
});

export const postIdValidationSchema = joi.object({
  postId: joi.string().uuid().required(),
});
