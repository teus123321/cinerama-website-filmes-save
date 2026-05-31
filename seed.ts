import bcrypt from 'bcrypt';
import prisma from './src/lib/prisma.js';

const senha = await bcrypt.hash('1234', 10);

await prisma.usuario.create({
  data: {
    nome: 'Mateus',
    email: 'mateus@email.com',
    senha,
  },
});

console.log('Usuário criado!');
await prisma.$disconnect();