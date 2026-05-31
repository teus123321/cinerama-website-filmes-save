import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const secret = process.env.JWT_SECRET!;
if (!secret) {
  throw new Error('JWT_SECRET não definido no .env!');
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token malformado' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.usuario = payload;
    next();
  } catch(error) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
}