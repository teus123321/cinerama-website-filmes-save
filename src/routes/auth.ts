import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';

const router = Router();
const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error('JWT_SECRET não definido no .env!');
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { nome, email, senha } = req.body as {
      nome: string;
      email: string;
      senha: string;
    };

    if (!nome || !email || !senha) {
      res.status(400).json({ error: 'nome, email e senha são obrigatórios' });
      return;
    }

    if (senha.length < 6) {
      res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    const usuarioExiste = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExiste) {
      res.status(409).json({ error: 'E-mail já cadastrado' });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: { nome, email, senha: senhaHash },
    });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome },
      secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, nome: usuario.nome, id: usuario.id });

  } catch (error) {
    if (error instanceof Error) console.error(error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body as { email: string; senha: string };

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome },
      secret,
      { expiresIn: '7d' }
    );

    res.json({ token, nome: usuario.nome, id: usuario.id });

  } catch (error) {
    if (error instanceof Error) console.error(error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;