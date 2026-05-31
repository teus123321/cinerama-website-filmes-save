import { Router, Request, Response } from 'express';
import { autenticar } from '../middlewares/auth.middleware.js'; // ← import que estava faltando

const router = Router();
const TMDB_KEY = process.env.TMDB_KEY;

router.get('/search', autenticar, async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;

        if (!query) {
            res.status(400).json({ error: 'O termo de busca (q) é obrigatório.' });
            return;
        }

        const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=pt-BR&page=1`;

        const tmdbResponse = await fetch(url, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${TMDB_KEY}`
            }
        });

        if (!tmdbResponse.ok) {
            throw new Error('Falha ao buscar dados no TMDB');
        }

        const data = (await tmdbResponse.json()) as { results: any[] };

        const filmesFormatados = data.results.map((filme: any) => ({
            tmdbId: filme.id,
            titulo: filme.title,
            ano: filme.release_date ? filme.release_date.split('-')[0] : null,
            poster: filme.poster_path
                ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
                : null,
            sinopse: filme.overview
        }));

        res.json(filmesFormatados.slice(0, 10));

    } catch (error) {
        if (error instanceof Error) console.error(error.message);
        res.status(500).json({ error: 'Erro interno ao buscar filmes.' });
    }
});

export default router;