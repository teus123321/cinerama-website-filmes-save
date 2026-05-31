import { Router } from 'express';
import type { Request, Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { autenticar } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/favoritos/:userId
// Só retorna se o token pertence ao mesmo usuário
router.get('/:userId', autenticar, async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const usuarioId = parseInt(req.params.userId, 10);

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID do usuário inválido' });
      return;
    }

    // Segurança: usuário só pode ver seus próprios favoritos
    const payload = req.usuario as JwtPayload;
    if (payload.id !== usuarioId) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const favoritos = await prisma.favorito.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: 'desc' },
    });

    res.json(favoritos);

  } catch (error) {
    if (error instanceof Error) console.error(error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/favoritos
router.post('/', autenticar, async (req: Request, res: Response) => {
  try {
    const { usuarioId, filmeId, titulo, poster } = req.body as {
      usuarioId: number;
      filmeId: number;
      titulo: string;
      poster?: string;
    };

    if (!usuarioId || !filmeId || !titulo) {
      res.status(400).json({ error: 'usuarioId, filmeId e titulo são obrigatórios' });
      return;
    }

    if (typeof usuarioId !== 'number' || typeof filmeId !== 'number') {
      res.status(400).json({ error: 'usuarioId e filmeId devem ser números' });
      return;
    }

    if (typeof titulo !== 'string' || titulo.trim() === '') {
      res.status(400).json({ error: 'titulo inválido' });
      return;
    }

    // Segurança: usuário só pode favoritar para si mesmo
    const payload = req.usuario as JwtPayload;
    if (payload.id !== usuarioId) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const favoritoExiste = await prisma.favorito.findFirst({
      where: { usuarioId, filmeId },
    });

    if (favoritoExiste) {
      res.status(400).json({ error: 'Filme já favoritado' });
      return;
    }

    const favorito = await prisma.favorito.create({
      data: { usuarioId, filmeId, titulo, poster },
    });

    res.status(201).json(favorito);

  } catch (error) {
    if (error instanceof Error) console.error(error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/favoritos/:id/watched — toggle assistido
router.patch('/:id/watched', autenticar, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const fav = await prisma.favorito.findUnique({ where: { id } });
    if (!fav) {
      res.status(404).json({ error: 'Favorito não encontrado' });
      return;
    }

    // Segurança: só o dono pode marcar como assistido
    const payload = req.usuario as JwtPayload;
    if (payload.id !== fav.usuarioId) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const atualizado = await prisma.favorito.update({
      where: { id },
      data: { watched: !fav.watched },
    });

    res.json(atualizado);

  } catch (error) {
    if (error instanceof Error) console.error(error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/favoritos/:id
router.delete('/:id', autenticar, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const fav = await prisma.favorito.findUnique({ where: { id } });
    if (!fav) {
      res.status(404).json({ error: 'Favorito não encontrado' });
      return;
    }

    // Segurança: só o dono pode remover
    const payload = req.usuario as JwtPayload;
    if (payload.id !== fav.usuarioId) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    await prisma.favorito.delete({ where: { id } });
    res.status(204).send();

  } catch (error) {
    if (error instanceof Error) console.error(error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;