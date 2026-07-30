import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from 'dotenv';
import { handleOAuthUser } from '../api/v1/auth/oauth/service';
import { Database } from '../database';
import { infoLogger } from '../utils/logger';
config();

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

// Register the Google strategy only when it is actually configured.
// passport-google-oauth20 throws from its constructor on a missing clientID, and
// this module is imported during app startup — so an unguarded registration made
// the whole API unbootable for anyone without Google credentials, even though
// email/password auth needs none.
export const isGoogleOAuthEnabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

if (isGoogleOAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID as string,
        clientSecret: GOOGLE_CLIENT_SECRET as string,
        // Must match an authorised redirect URI on the Google client. Kept in env
        // so local development does not bounce through the production host.
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:5001/api/v1/auth/google/redirect',
      },
      handleOAuthUser,
    ),
  );
} else {
  infoLogger(
    'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set — Google sign-in is disabled. ' +
      'Email and password authentication is unaffected.',
    'OAuth',
  );
}

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
