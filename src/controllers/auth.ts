import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';
import logger from '../utils/logger';

const googleClient = new OAuth2Client(config.googleClientId);

export class AuthController {

  static async googleSignIn(req: Request|any, res: Response|any) {
    try {
      const { token } = req.body;
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: config.googleClientId
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token');
      }

      let user = await User.findOne({ googleId: payload.sub });
      if (!user) {
        user = new User({
          email: payload.email,
          googleId: payload.sub
        });
        await user.save();
      }

      const jwtToken = jwt.sign(
        { _id: user._id, email: user.email },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({ token: jwtToken });
    } catch (error) {
      logger.error('Google Sign In Error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
}