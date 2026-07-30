import joi from 'joi';

export const AddEmailSchema = joi.object({
  email: joi
    .string()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .required()
    .max(255)
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'string.max': 'Email must be less than 255 characters',
      'any.required': 'Email is required',
    }),
});

export const UnsubscribeTokenSchema = joi.object({
  token: joi.string().required().messages({
    'string.empty': 'Unsubscribe token is required',
    'any.required': 'Unsubscribe token is required',
  }),
});

export const PaginationSchema = joi.object({
  page: joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: joi.number().integer().min(1).max(100).default(50).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  search: joi.string().allow('').max(100).messages({
    'string.max': 'Search term must be less than 100 characters',
  }),
});

// If you want to add query validation to your routes, you can use:
export const GetSubscribersQuerySchema = joi.object({
  page: joi.string().pattern(/^\d+$/).optional(),
  limit: joi.string().pattern(/^\d+$/).optional(),
  search: joi.string().max(100).optional(),
});
