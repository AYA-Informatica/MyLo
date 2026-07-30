/* eslint-disable @typescript-eslint/no-explicit-any */ import { config } from 'dotenv';
import { Database } from '../../../../database';
config();

export async function handleOAuthUser(
  accessToken: string,
  refreshToken: string,
  profile: any,
  done: any,
): Promise<any> {
  try {
    const existingUser = await Database.User.findOne({
      where: { googleId: profile.id },
      raw: true,
    });
    if (existingUser) {
      return done(null, existingUser);
    }
    const role = await Database.Role.findOne({ where: { name: 'citizen' }, raw: true });

    if (!role) {
      throw new Error('Role not found');
    }

    const newUser = await Database.User.create({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0]?.value,
      provider: 'google',
      roleId: role?.id as string,
      password: '',
      isActive: true,
    });

    done(null, newUser.dataValues);
  } catch (err) {
    return done(err, null);
  }
}
