import joi from 'joi';

export const updateUserSchema = joi.object({
  name: joi.string().optional(),
  username: joi.string().optional(),
  email: joi.string().email().optional(),
  address: joi.string().optional(),
  registrationNumber: joi.number().optional(),
});

export const IdValidationSchema = joi.object({
  id: joi.string().uuid().required(),
});
