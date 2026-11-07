import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const base = "http://127.0.0.1:3000";
const file = "docs/audit-ui-fixture.json";
async function api(path, method = "GET", body) {
  const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return response.json();
}

if (process.argv[2] === "prepare") {
  const authors = await api("/api/authors");
  const author = authors.find(item => item.email === "audit-tarea-20261107@example.com" && item.name === "Autora Auditoría TAREA")
    ?? await api("/api/authors", "POST", { name: "Autora Auditoría TAREA", email: "audit-tarea-20261107@example.com", nationality: "Perú", birthYear: 1980, bio: "Biografía temporal para auditar todos los requisitos." });
  const alternate = await api("/api/authors", "POST", { name: "Autor alternativo Auditoría", email: `audit-alternate-${Date.now()}@example.com` });
  const fixture = { authorId: author.id, authorEmail: author.email, alternateId: alternate.id, alternateEmail: alternate.email, bookIds: [], status: "preparing" };
  await writeFile(file, JSON.stringify(fixture, null, 2));
  for (let index = 0; index < 6; index++) {
    const book = await api("/api/books", "POST", { title: `Serie Auditoría ${String(index).padStart(2, "0")}`, authorId: author.id, genre: index % 2 ? "Ensayo Auditoría" : "Novela Auditoría", publishedYear: 2000 + index, pages: 100 + index * 10 });
    fixture.bookIds.push(book.id); await writeFile(file, JSON.stringify(fixture, null, 2));
  }
  fixture.status = "ready"; await writeFile(file, JSON.stringify(fixture, null, 2)); console.log(JSON.stringify(fixture));
} else if (process.argv[2] === "cleanup") {
  const fixture = JSON.parse(await readFile(file, "utf8"));
  for (const [id, email] of [[fixture.authorId, fixture.authorEmail], [fixture.alternateId, fixture.alternateEmail]]) {
    const response = await fetch(base + `/api/authors/${id}`);
    if (response.status === 404) continue;
    const author = await response.json(); assert.equal(author.email, email, "Ownership must match before cleanup.");
    if (id === fixture.authorId) fixture.bookIds = [...new Set([...fixture.bookIds, ...author.books.map(book => book.id)])];
    await api(`/api/authors/${id}`, "DELETE");
    assert.equal((await fetch(base + `/api/authors/${id}`)).status, 404);
  }
  for (const id of fixture.bookIds) assert.equal((await fetch(base + `/api/books/${id}`)).status, 404);
  fixture.status = "cleaned-and-verified"; await writeFile(file, JSON.stringify(fixture, null, 2)); console.log("Audit fixtures cleaned; owned author and book URLs return 404.");
} else throw new Error("Use prepare or cleanup.");
