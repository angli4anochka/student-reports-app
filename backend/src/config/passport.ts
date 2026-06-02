import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

export function initializePassport() {
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true
        }
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract email from Google profile
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Check if user exists
          let user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              password: true
            }
          });

          if (!user) {
            // Create new user if doesn't exist
            const fullName = profile.displayName || email.split('@')[0];

            user = await prisma.user.create({
              data: {
                email,
                fullName,
                password: '', // No password for Google OAuth users
                role: 'TEACHER' // Default role
              },
              select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                password: true
              }
            });

            console.log(`✅ New user created via Google OAuth: ${email}`);
          } else {
            console.log(`✅ Existing user logged in via Google OAuth: ${email}`);
          }

          // Return user without password
          const { password, ...userWithoutPassword } = user;
          return done(null, userWithoutPassword);
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );
}

export default passport;
