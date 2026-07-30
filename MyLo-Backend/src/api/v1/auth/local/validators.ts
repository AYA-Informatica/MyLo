import joi from 'joi';

export const createCitizenSchema = joi.object({
  username: joi.string().min(3).required(),
  email: joi.string().email().required(),
  password: joi.string().min(8).required(),
});

export const createOrganizationSchema = joi.object({
  name: joi.string().min(2).required(),
  email: joi.string().email().required(),
  address: joi.string().min(2).required(),
  registrationNumber: joi.number().min(9).required(),
  password: joi.string().min(8).required(),
});

export const LoginUserSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().required(),
});
