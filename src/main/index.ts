import 'dotenv/config';
import moviesRouter from '../routes/movie.js';
import favoritesRouter from '../routes/favorites.js';
import authRouter from '../routes/auth.js';
import express from 'express';
import type { Application } from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';

const app: Application = express();
const PORT: number = parseInt(process.env.PORT ?? '3000', 10);
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];
  
// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Permite se não tiver origem (ferramentas locais) ou se estiver na lista permitida
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pelo CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public'));

// Rotas
app.use('/api/filmes',    moviesRouter);
app.use('/api/favoritos', favoritesRouter);
app.use('/api/auth',      authRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'CineList API rodando!' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});