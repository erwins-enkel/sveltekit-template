/**
 * Drizzle schema — single source of truth for the database structure.
 *
 * Add tables here, then generate a SQL migration with:
 *
 *   bun run db:generate
 *
 * Apply migrations against the configured `DATABASE_URL` with:
 *
 *   bun run db:migrate
 *
 * The Vercel build runs `db:migrate` automatically via the `vercel-build`
 * script in package.json.
 *
 * Example table (uncomment and adapt):
 *
 *   import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
 *
 *   export const users = pgTable('users', {
 *     id: uuid('id').primaryKey().defaultRandom(),
 *     email: text('email').notNull().unique(),
 *     createdAt: timestamp('created_at', { withTimezone: true })
 *       .notNull()
 *       .defaultNow()
 *   });
 */

export {};
