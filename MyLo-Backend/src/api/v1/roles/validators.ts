import joi from 'joi';

export const createRoleSchema = joi.object({
  name: joi.string().min(2).required(),
  permissions: joi.array().items(joi.string()),
});

export const updateRoleSchema = joi.object({
  name: joi.string().min(2),
  permissions: joi.array().items(joi.string()),
});
