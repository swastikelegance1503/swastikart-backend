import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const match = typeof authHeader === 'string'
    ? authHeader.match(/^Bearer\s+(\S+)$/i)
    : null;

  const rawToken = match ? match[1] : (req.query && typeof req.query.token === 'string' ? req.query.token : null);

  if (!rawToken) {
    return res.status(401).json({
      success: false,
      message: 'ટોકન મળ્યો નથી. (A Bearer access token or query token is required.)'
    });
  }

  jwt.verify(rawToken, JWT_SECRET, { algorithms: ['HS256'] }, (error, decodedUser) => {
    if (error) {
      return res.status(403).json({
        success: false,
        message: 'ટોકન અમાન્ય અથવા સમાપ્ત થઈ ગયો છે. (Invalid or expired token.)'
      });
    }

    req.user = decodedUser;
    next();
  });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'આ કામગીરી માટે પરવાનગી નથી. (Insufficient permissions.)'
      });
    }

    next();
  };
}
