import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from 'dotenv';
import { handleOAuthUser } from '../api/v1/auth/oauth/service';
import { Database } from '../database';
config();

passport.use(
  new GoogleStrategy(
    {
      // options for the google strategy
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: 'https://menyalo-backend.onrender.com/api/v1/auth/google/redirect',
    },
    handleOAuthUser,
  ),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await Database.User.findOne({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
