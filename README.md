# 🍿 Cinerama API

> O backend por trás do seu próximo catálogo de filmes favorito.

A **Cinerama API** é uma aplicação RESTful construída para o gerenciamento de catálogos de filmes. O foco deste projeto foi criar uma arquitetura sólida e moderna, integrando o catálogo externo do TMDB com um sistema seguro de autenticação de usuários e persistência de dados.

## ✨ O que a API faz?
* **Gestão de Usuários:** Cadastro seguro de usuários com criptografia de senhas.
* **Autenticação:** Login protegido com geração e validação de tokens (JWT).
* **Catálogo (Integração TMDB):** Busca inteligente de filmes utilizando a API externa do The Movie Database.
* **Persistência de Dados:** Banco de dados relacional estruturado e versionado através de Migrations (Prisma ORM).

## 🚀 Tecnologias e Ferramentas
* **Backend:** Node.js com TypeScript
* **Banco de Dados:** PostgreSQL
* **ORM:** Prisma
* **Segurança:** JSON Web Token (JWT)
* **Infraestrutura:** Docker & Docker Compose
* **Deploy Cloud:** Railway

## 📦 Como rodar localmente

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/teus123321/cinerama-website-filmes-save.git](https://github.com/teus123321/cinerama-website-filmes-save.git)
   cd cinerama-website-filmes-save
