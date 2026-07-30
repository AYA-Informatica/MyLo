import { createCitizenSchema, createOrganizationSchema, LoginUserSchema } from './validators';

/**
 * These schemas are the API's outermost gate — every registration and login body
 * passes through them before any service or database code runs, so the rules they
 * encode are worth pinning down.
 */
describe('auth validators', () => {
  describe('createCitizenSchema', () => {
    const valid = {
      username: 'testcitizen',
      email: 'citizen@example.com',
      password: 'SuperSecret123',
    };

    it('accepts a well-formed citizen registration', () => {
      const { error } = createCitizenSchema.validate(valid);
      expect(error).toBeUndefined();
    });

    it.each([
      ['username', 'ab', 'username shorter than 3 characters'],
      ['password', 'short12', 'password shorter than 8 characters'],
      ['email', 'not-an-email', 'malformed email'],
    ])('rejects %s: %s', (field, badValue) => {
      const { error } = createCitizenSchema.validate({ ...valid, [field]: badValue });
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain(field);
    });

    it.each(['username', 'email', 'password'])('requires %s', (field) => {
      const body: Record<string, unknown> = { ...valid };
      delete body[field];

      const { error } = createCitizenSchema.validate(body);
      expect(error).toBeDefined();
      expect(error?.details[0].type).toBe('any.required');
    });

    it('rejects unknown fields rather than silently dropping them', () => {
      // Guards against a caller believing it set something the API ignored —
      // e.g. trying to self-assign a role at registration time.
      const { error } = createCitizenSchema.validate({ ...valid, roleId: 'admin' });
      expect(error).toBeDefined();
    });
  });

  describe('createOrganizationSchema', () => {
    const valid = {
      name: 'Acme Legal',
      email: 'org@example.com',
      address: 'Kigali',
      registrationNumber: 123456789,
      password: 'SuperSecret123',
    };

    it('accepts a well-formed organization registration', () => {
      const { error } = createOrganizationSchema.validate(valid);
      expect(error).toBeUndefined();
    });

    it('requires a registration number', () => {
      const { registrationNumber, ...withoutNumber } = valid;
      void registrationNumber;

      const { error } = createOrganizationSchema.validate(withoutNumber);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('registrationNumber');
    });

    it('rejects a non-numeric registration number', () => {
      const { error } = createOrganizationSchema.validate({
        ...valid,
        registrationNumber: 'not-a-number',
      });
      expect(error).toBeDefined();
    });
  });

  describe('LoginUserSchema', () => {
    it('accepts an email and password pair', () => {
      const { error } = LoginUserSchema.validate({
        email: 'citizen@example.com',
        password: 'anything',
      });
      expect(error).toBeUndefined();
    });

    it('does not impose a length rule on the login password', () => {
      // Login must accept whatever is on record. Enforcing the registration
      // minimum here would lock out any account created before that rule.
      const { error } = LoginUserSchema.validate({ email: 'citizen@example.com', password: 'x' });
      expect(error).toBeUndefined();
    });

    it('rejects a missing password', () => {
      const { error } = LoginUserSchema.validate({ email: 'citizen@example.com' });
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('password');
    });
  });
});
