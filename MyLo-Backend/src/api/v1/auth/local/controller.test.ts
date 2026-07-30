import { Response } from 'express';
import { IRequestUser } from '../../../../middleware/unifiedAuthMiddleware';

// Jest hoists jest.mock() above these declarations, so every binding the factory
// touches must be `mock`-prefixed for the hoisting guard to allow it.
const mockConstructorCalls: unknown[][] = [];

const mockCitizenRegister = jest.fn();
const mockOrganizationRegister = jest.fn();
const mockLawFirmRegister = jest.fn();
const mockLogin = jest.fn();
const mockLogout = jest.fn();

// The service reaches for the database and the mailer at import time, so it is
// mocked here: these tests cover the controller's own contract — that it hands
// the request body, response and bearer token to the right service method.
jest.mock('./service', () => ({
  AuthService: jest.fn().mockImplementation((...args: unknown[]) => {
    mockConstructorCalls.push(args);
    return {
      citizenRegister: mockCitizenRegister,
      organizationRegister: mockOrganizationRegister,
      lawFirmRegister: mockLawFirmRegister,
      login: mockLogin,
      logout: mockLogout,
    };
  }),
}));

import { AuthController } from './controller';

describe('AuthController', () => {
  const token = 'a-bearer-token';
  let controller: AuthController;
  let req: IRequestUser;
  let res: Response;

  beforeEach(() => {
    mockConstructorCalls.length = 0;
    controller = new AuthController();
    req = {
      body: { email: 'citizen@example.com', password: 'SuperSecret123' },
      token,
    } as unknown as IRequestUser;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
  });

  it.each([
    ['citizenRegister', (): jest.Mock => mockCitizenRegister],
    ['organizationRegister', (): jest.Mock => mockOrganizationRegister],
    ['lawFirmRegister', (): jest.Mock => mockLawFirmRegister],
    ['login', (): jest.Mock => mockLogin],
  ] as const)('%s delegates to the matching service method', (method, getSpy) => {
    controller[method](req, res);

    expect(getSpy()).toHaveBeenCalledTimes(1);
  });

  it('constructs the service with the request body, response and token', () => {
    controller.login(req, res);

    expect(mockConstructorCalls).toHaveLength(1);
    expect(mockConstructorCalls[0]).toEqual([req.body, res, token]);
  });

  it('passes the request and response through to logout', () => {
    controller.logout(req, res);

    expect(mockLogout).toHaveBeenCalledWith(req, res);
  });

  it('tolerates a request with no bearer token', () => {
    // Registration is unauthenticated, so `req.token` is routinely undefined and
    // must not throw on the way into the service.
    const anonymous = { body: req.body } as unknown as IRequestUser;

    expect(() => controller.citizenRegister(anonymous, res)).not.toThrow();
    expect(mockConstructorCalls[0]).toEqual([anonymous.body, res, undefined]);
  });
});
