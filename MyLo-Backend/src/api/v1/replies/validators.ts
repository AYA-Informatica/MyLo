import joi from 'joi';

export const createReplySchema = joi.object({
  content: joi.string().required(),
});

export const updateReplySchema = joi.object({
  content: joi.string().optional(),
});

export const replyParamsValidationSchema = joi.object({
  postId: joi.string().uuid().required(),
  commentId: joi.string().uuid().required(),
  replyId: joi.string().uuid().required(),
});

export const nestedReplyParamsValidationSchema = joi.object({
  postId: joi.string().uuid().required(),
  commentId: joi.string().uuid().required(),
});
