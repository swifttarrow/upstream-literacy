# Task 001: Project Scaffold

## Goal

Create root project configuration: `package.json`, `tsconfig.json`, `.env.example`, and npm scripts for build, lint, and dev.

## Deliverables

- [ ] `package.json` with Node/TypeScript dependencies (Fastify, pg or Drizzle, bcrypt, Zod, dotenv, etc.)
- [ ] `tsconfig.json` targeting ES2022, strict mode, `outDir` for compiled output
- [ ] `.env.example` with `DATABASE_URL`, `JWT_SECRET` (or equivalent), `NODE_ENV`
- [ ] Scripts: `build`, `start`, `dev`, `lint`
- [ ] `.gitignore` excluding `node_modules`, `.env`, `dist`

## Notes

- Tech stack per plan: Node/TypeScript + Fastify
- Use `@fastify/cors` and `@fastify/env` if needed
- Consider `tsx` or `ts-node` for dev

## Verification

```bash
npm install
npm run build
npm run lint
```
