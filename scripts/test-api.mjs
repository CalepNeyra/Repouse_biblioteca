import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const token = `lab12-${Date.now()}`;
const ownedAuthors = new Set();
const results = [];
const requests = [];
const samples = {};
let failed = false;
let cleanupFailed = false;
let activeCheck = "setup";

async function request(method, path, payload, status = 200) {
  const started = Date.now();
  const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: payload === undefined ? undefined : JSON.stringify(payload), signal: AbortSignal.timeout(45000) });
  const result = await response.json();
  requests.push({ check: activeCheck, method, path, expectedStatus: status, actualStatus: response.status, milliseconds: Date.now() - started });
  assert.equal(response.status, status, `${method} ${path}: expected ${status}, got ${response.status}`);
  return result;
}
async function check(name, action) {
  activeCheck = `H${String(results.length + 1).padStart(2, "0")}`;
  try { await action(); results.push({ id: activeCheck, name, status: "PASS" }); console.log(`PASS ${activeCheck} ${name}`); }
  catch (error) { results.push({ id: activeCheck, name, status: "FAIL", detail: error.message }); throw error; }
}

try {
  let author, other, book, later, unknown;
  await check("POST author / persistence", async () => {
    author = await request("POST", "/api/authors", { name: `Gabriel ${token}`, email: `${token}@example.com`, nationality: "Colombia", birthYear: 1927, bio: "Autor de prueba temporal" }, 201);
    ownedAuthors.add(author.id); assert.ok(author.id); assert.deepEqual(author.books, []);
    assert.equal((await request("GET", `/api/authors/${author.id}`)).name, author.name);
  });
  await check("GET authors includes books and count", async () => {
    const item = (await request("GET", "/api/authors")).find(a => a.id === author.id); assert.equal(item._count.books, 0); assert.deepEqual(item.books, []);
  });
  await check("Statistics for author without books", async () => {
    const stats = await request("GET", `/api/authors/${author.id}/stats`);
    assert.equal(stats.totalBooks, 0); assert.equal(stats.averagePages, null); assert.equal(stats.firstBook, null); assert.equal(stats.latestBook, null); assert.equal(stats.longestBook, null); assert.equal(stats.shortestBook, null); assert.deepEqual(stats.genres, []);
  });
  await check("Duplicate email returns 409", () => request("POST", "/api/authors", { name: "Duplicado", email: author.email }, 409));
  await check("Invalid authors return 400", async () => {
    for (const value of [{}, { name: " ", email: "a@example.com" }, { name: "Autor", email: "invalid" }, { name: "Autor", email: "a@example.com", birthYear: 3.5 }, { name: "Autor", email: "a@example.com", bio: [] }]) await request("POST", "/api/authors", value, 400);
  });
  await check("Malformed JSON returns 400", async () => {
    const response = await fetch(base + "/api/authors", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }); assert.equal(response.status, 400);
    await request("POST", "/api/authors", [], 400);
  });
  await check("PUT author preserves omitted fields", async () => {
    const updated = await request("PUT", `/api/authors/${author.id}`, { bio: "Biografía actualizada" }); assert.equal(updated.bio, "Biografía actualizada"); assert.equal(updated.birthYear, 1927); assert.equal(updated.email, author.email);
    await request("PUT", `/api/authors/${author.id}`, {}, 400); await request("PUT", `/api/authors/${author.id}`, { name: null }, 400);
  });
  await check("Second author / duplicate update", async () => {
    other = await request("POST", "/api/authors", { name: `Otro ${token}`, email: `other-${token}@example.com` }, 201); ownedAuthors.add(other.id);
    await request("PUT", `/api/authors/${other.id}`, { email: author.email }, 409);
  });
  await check("POST book / GET book", async () => {
    book = await request("POST", "/api/books", { title: `Amor Alfa ${token}`, authorId: author.id, isbn: token, publishedYear: 1967, genre: token, pages: 100, description: "Descripción" }, 201);
    const stored = await request("GET", `/api/books/${book.id}`); assert.equal(stored.title, book.title); assert.equal(stored.author.id, author.id);
  });
  await check("Duplicate ISBN returns 409", () => request("POST", "/api/books", { title: "Duplicado", authorId: author.id, isbn: token }, 409));
  await check("Book validation / missing author", async () => {
    for (const value of [{}, { title: "ab", authorId: author.id }, { title: "Válido", authorId: author.id, pages: 0 }, { title: "Válido", authorId: author.id, pages: 2.5 }, { title: "Válido", authorId: author.id, genre: 1 }]) await request("POST", "/api/books", value, 400);
    await request("POST", "/api/books", { title: "Válido", authorId: "missing-author" }, 404);
  });
  await check("Books with optional and null fields", async () => {
    later = await request("POST", "/api/books", { title: `Amor Zeta ${token}`, authorId: author.id, publishedYear: 2004, genre: token, pages: 300 }, 201);
    unknown = await request("POST", "/api/books", { title: `Sin datos ${token}`, authorId: author.id }, 201); assert.equal(unknown.pages, null); assert.equal(unknown.isbn, null);
  });
  await check("GET books filtered by genre and author", async () => {
    const list = await request("GET", `/api/books?genre=${token}&authorId=${author.id}`); assert.equal(list.length, 2); assert.ok(list.every(b => b.authorId === author.id && b.genre === token));
  });
  await check("GET books by author matches guide response", async () => {
    const result = await request("GET", `/api/authors/${author.id}/books`); assert.equal(result.totalBooks, 3); assert.equal(result.books.length, 3); assert.equal(result.author.id, author.id);
  });
  await check("Full statistics / unknown fields excluded", async () => {
    const stats = await request("GET", `/api/authors/${author.id}/stats`);
    samples.statistics = stats;
    assert.equal(stats.authorId, author.id); assert.equal(stats.authorName, author.name);
    assert.deepEqual(Object.keys(stats).sort(), ["authorId", "authorName", "totalBooks", "firstBook", "latestBook", "averagePages", "genres", "longestBook", "shortestBook"].sort());
    assert.equal(stats.totalBooks, 3); assert.deepEqual(stats.firstBook, { title: book.title, year: 1967 }); assert.deepEqual(stats.latestBook, { title: later.title, year: 2004 }); assert.equal(stats.averagePages, 200); assert.deepEqual(stats.genres, [token]); assert.deepEqual(stats.longestBook, { title: later.title, pages: 300 }); assert.deepEqual(stats.shortestBook, { title: book.title, pages: 100 });
  });
  await check("Search combines case-insensitive title, exact genre, authorName", async () => {
    const result = await request("GET", `/api/books/search?search=AMOR&genre=${token}&authorName=${encodeURIComponent(author.name.toUpperCase())}&sortBy=title&order=asc`);
    assert.equal(result.pagination.total, 2); assert.deepEqual(result.data.map(b => b.id), [book.id, later.id]);
  });
  await check("Search pagination and descending year", async () => {
    const path = `/api/books/search?genre=${token}&limit=1&sortBy=publishedYear&order=desc`;
    const first = await request("GET", path); const second = await request("GET", path + "&page=2");
    assert.equal(first.data[0].id, later.id); assert.equal(second.data[0].id, book.id);
    assert.deepEqual(first.pagination, { page: 1, limit: 1, total: 2, totalPages: 2, hasNext: true, hasPrev: false }); assert.equal(second.pagination.hasPrev, true); assert.equal(second.pagination.hasNext, false);
  });
  await check("Search default parameters and empty results", async () => {
    const result = await request("GET", `/api/books/search?search=nonexistent-${token}`);
    assert.deepEqual(result.data, []); assert.deepEqual(result.pagination, { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
    assert.equal((await request("GET", `/api/books/search?authorId=${other.id}`)).pagination.total, 0);
  });
  await check("Search rejects invalid pagination / sort / order", async () => {
    for (const query of ["page=0", "page=1.5", "page=-1", "page=abc", "limit=51", "limit=0", "limit=1.5", "sortBy=email", "order=invalid"]) await request("GET", `/api/books/search?${query}`, undefined, 400);
    assert.equal((await request("GET", `/api/books/search?genre=${token}&limit=50`)).data.length, 2);
  });
  await check("Available genres are unique", async () => { const list = await request("GET", "/api/books/genres"); assert.ok(list.includes(token)); assert.equal(new Set(list).size, list.length); });
  await check("PUT book / reassignment / optional reset", async () => {
    const updated = await request("PUT", `/api/books/${book.id}`, { description: "Actualizado", pages: null, authorId: other.id }); assert.equal(updated.pages, null); assert.equal(updated.author.id, other.id); assert.equal(updated.publishedYear, 1967);
    await request("PUT", `/api/books/${book.id}`, { authorId: author.id, pages: 100 });
    await request("PUT", `/api/books/${book.id}`, { title: "ab" }, 400); await request("PUT", `/api/books/${book.id}`, {}, 400); await request("PUT", `/api/books/${book.id}`, { authorId: "missing-author" }, 404);
    await request("PUT", `/api/books/${unknown.id}`, { isbn: token }, 409);
  });
  await check("All missing records return 404", async () => {
    for (const path of ["/api/authors/missing", "/api/authors/missing/books", "/api/authors/missing/stats", "/api/books/missing"]) await request("GET", path, undefined, 404);
    await request("PUT", "/api/authors/missing", { bio: "Test" }, 404); await request("PUT", "/api/books/missing", { title: "Test" }, 404);
    await request("DELETE", "/api/authors/missing", undefined, 404); await request("DELETE", "/api/books/missing", undefined, 404);
  });
  const pagingBooks = [];
  await check("Default page=1 limit=10 createdAt desc with 13 real books", async () => {
    for (let index = 0; index < 13; index++) pagingBooks.push(await request("POST", "/api/books", { title: `${token} Obra ${String(12 - index).padStart(2, "0")}`, authorId: other.id, genre: `${token}-paging`, publishedYear: 1950 + ((index * 7) % 13) }, 201));
    const expected = [...pagingBooks].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
    const first = await request("GET", `/api/books/search?authorId=${other.id}`);
    const second = await request("GET", `/api/books/search?authorId=${other.id}&page=2`);
    assert.deepEqual(first.pagination, { page: 1, limit: 10, total: 13, totalPages: 2, hasNext: true, hasPrev: false });
    assert.deepEqual(second.pagination, { page: 2, limit: 10, total: 13, totalPages: 2, hasNext: false, hasPrev: true });
    assert.deepEqual(first.data.map(b => b.id), expected.slice(0, 10).map(b => b.id));
    assert.deepEqual(second.data.map(b => b.id), expected.slice(10).map(b => b.id));
    assert.equal(new Set([...first.data, ...second.data].map(b => b.id)).size, 13);
    samples.pagination = { first: first.pagination, second: second.pagination, firstTitles: first.data.map(b => b.title), secondTitles: second.data.map(b => b.title) };
  });
  await check("All three sort fields in both asc and desc", async () => {
    samples.sorting = [];
    for (const field of ["title", "publishedYear", "createdAt"]) for (const order of ["asc", "desc"]) {
      const result = await request("GET", `/api/books/search?authorId=${other.id}&limit=50&sortBy=${field}&order=${order}`);
      const expected = [...pagingBooks].sort((a, b) => {
        const comparison = field === "title" ? a.title.localeCompare(b.title) : field === "createdAt" ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : a.publishedYear - b.publishedYear;
        return comparison * (order === "asc" ? 1 : -1) || a.id.localeCompare(b.id);
      });
      assert.deepEqual(result.data.map(b => b.id), expected.map(b => b.id));
      samples.sorting.push({ field, order, actualValues: result.data.map(b => b[field]) });
    }
  });
  await check("Partial title and authorName / exact genre / combined AND", async () => {
    const query = new URLSearchParams({ search: "aMoR", authorName: `aBrIeL ${token}`, genre: token });
    assert.equal((await request("GET", `/api/books/search?${query}`)).pagination.total, 2);
    query.set("genre", token.toUpperCase()); assert.equal((await request("GET", `/api/books/search?${query}`)).pagination.total, 0);
    query.set("genre", token + "-paging"); assert.equal((await request("GET", `/api/books/search?${query}`)).pagination.total, 0);
    const partial = await request("GET", `/api/books/search?authorId=${other.id}&search=OBRA%200&limit=50`);
    assert.equal(partial.pagination.total, 10);
  });
  await check("Pagination beyond last page / limit=50 / full JSON contract", async () => {
    const result = await request("GET", `/api/books/search?authorId=${other.id}&page=3&limit=10`);
    assert.deepEqual(result.data, []); assert.deepEqual(result.pagination, { page: 3, limit: 10, total: 13, totalPages: 2, hasNext: false, hasPrev: true });
    assert.deepEqual(Object.keys(result).sort(), ["data", "pagination"]);
    assert.equal((await request("GET", `/api/books/search?authorId=${other.id}&limit=50`)).data.length, 13);
  });
  await check("Unknown years and pages / unique genres / rounded average", async () => {
    const optional = await request("POST", "/api/authors", { name: `Opcionales ${token}`, email: `optional-${token}@example.com` }, 201); ownedAuthors.add(optional.id);
    const created = [];
    for (let index = 0; index < 3; index++) created.push(await request("POST", "/api/books", { title: `Opcional ${index} ${token}`, authorId: optional.id, genre: index < 2 ? token : null }, 201));
    const empty = await request("GET", `/api/authors/${optional.id}/stats`);
    assert.equal(empty.totalBooks, 3); for (const key of ["firstBook", "latestBook", "averagePages", "longestBook", "shortestBook"]) assert.equal(empty[key], null);
    assert.deepEqual(empty.genres, [token]);
    for (let index = 0; index < 3; index++) await request("PUT", `/api/books/${created[index].id}`, { pages: index === 0 ? 1 : 2 });
    const stats = await request("GET", `/api/authors/${optional.id}/stats`); assert.equal(stats.averagePages, 1.67); assert.equal(stats.shortestBook.pages, 1); assert.equal(stats.longestBook.pages, 2); assert.equal(stats.firstBook, null);
    samples.optionalStatistics = { allNull: empty, rounded: stats };
  });
  await check("All three pages return HTML", async () => {
    for (const path of ["/", "/books", `/authors/${author.id}`]) { const response = await fetch(base + path); assert.equal(response.status, 200); assert.match(response.headers.get("content-type"), /text\/html/); assert.match(await response.text(), /Biblioteca/); }
  });
  await check("DELETE book returns JSON confirmation", async () => { assert.ok((await request("DELETE", `/api/books/${unknown.id}`)).message); await request("GET", `/api/books/${unknown.id}`, undefined, 404); });
  await check("DELETE author cascades only its books", async () => {
    assert.ok((await request("DELETE", `/api/authors/${author.id}`)).message); ownedAuthors.delete(author.id);
    await request("GET", `/api/books/${book.id}`, undefined, 404); await request("GET", `/api/books/${later.id}`, undefined, 404); assert.equal((await request("GET", `/api/authors/${other.id}`)).id, other.id);
  });
} catch (error) { failed = true; console.error(error.message); }
finally {
  activeCheck = "cleanup";
  for (const id of ownedAuthors) {
    try { await request("DELETE", `/api/authors/${id}`); await request("GET", `/api/authors/${id}`, undefined, 404); }
    catch { failed = true; cleanupFailed = true; results.push({ name: `Cleanup owned author ${id}`, status: "FAIL" }); }
  }
  await mkdir("docs", { recursive: true });
  await writeFile("docs/api-test-results.json", JSON.stringify({ date: new Date().toISOString(), base, passed: results.filter(r => r.status === "PASS").length, failed, cleanupSuccessful: !cleanupFailed, results, requests, samples }, null, 2) + "\n");
  console.log(`${results.filter(r => r.status === "PASS").length} groups passed. Temporary records cleaned: ${!cleanupFailed}. Requests recorded: ${requests.length}.`);
  process.exitCode = failed ? 1 : 0;
}
