import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
config({ quiet: true });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 }) });
(async () => {
  const tables = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Author', 'Book') ORDER BY table_name`;
  const version = await db.$queryRaw`SELECT current_setting('server_version') AS version`;
  const indexes = await db.$queryRaw`SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('Author', 'Book') ORDER BY indexname`;
  const relations = await db.$queryRaw`SELECT tc.table_name, rc.delete_rule FROM information_schema.table_constraints tc JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema WHERE tc.table_schema = 'public' AND tc.table_name = 'Book' AND tc.constraint_type = 'FOREIGN KEY'`;
  console.log(JSON.stringify({ version, tables, indexes, relations, authors: await db.author.count(), books: await db.book.count() }, null, 2));
  if (tables.length !== 2) process.exitCode = 1;
})().catch((error) => { console.error('Database verification failed:', error.code || error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
