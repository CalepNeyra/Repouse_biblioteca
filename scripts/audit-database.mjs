import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

config({ quiet: true });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 }) });
try {
  const fixture = JSON.parse(await readFile("docs/audit-ui-fixture.json", "utf8"));
  const metadata = await db.$queryRaw`SELECT current_database() = 'neondb' AS database_matches, current_user = 'neondb_owner' AS role_matches, current_setting('server_version') AS version`;
  assert.equal(metadata[0].database_matches, true); assert.equal(metadata[0].role_matches, true);
  const author = await db.author.findUnique({ where: { id: fixture.authorId }, include: { books: true } });
  assert.ok(author); assert.equal(author.email, fixture.authorEmail); assert.equal(author.books.length, 8);
  const response = await fetch(`http://127.0.0.1:3000/api/authors/${fixture.authorId}/stats`);
  assert.equal(response.status, 200);
  const stats = await response.json();
  assert.equal(stats.totalBooks, author.books.length);
  assert.equal(stats.averagePages, Math.round(author.books.reduce((sum, book) => sum + book.pages, 0) / author.books.length * 100) / 100);
  assert.equal(stats.averagePages, 156.5); assert.equal(stats.firstBook.year, 2000); assert.equal(stats.latestBook.year, 2020);
  assert.equal(stats.longestBook.pages, 300); assert.equal(stats.shortestBook.pages, 100);
  const counts = { authors: await db.author.count(), books: await db.book.count() };
  const result = { date: new Date().toISOString(), status: "CUMPLE", metadata, fixtureBooksReadDirectlyFromNeon: author.books.length, statisticsFromHttp: stats, countsBeforeFixtureCleanup: counts };
  await writeFile("docs/audit-database-results.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: "CUMPLE", metadata, fixtureBooksReadDirectlyFromNeon: author.books.length, httpAverageMatchesDatabase: true }));
} catch (error) { console.error("Database audit failed:", error.code || error.name); process.exitCode = 1; }
finally { await db.$disconnect(); }
