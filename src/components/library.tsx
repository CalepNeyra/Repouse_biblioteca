"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Author = { id: string; name: string; email: string; bio: string | null; nationality: string | null; birthYear: number | null; _count?: { books: number }; books?: Book[] };
type Book = { id: string; title: string; description: string | null; isbn: string | null; publishedYear: number | null; genre: string | null; pages: number | null; authorId: string; author?: Author };
type Pagination = { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
type Stats = { totalBooks: number; firstBook: { title: string; year: number } | null; latestBook: { title: string; year: number } | null; averagePages: number | null; genres: string[]; longestBook: { title: string; pages: number } | null; shortestBook: { title: string; pages: number } | null };

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data as T;
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <div className="panel"><p className="text-sm text-slate-500">{title}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></div>;
}

function RecordForm({ kind, initial, authors, fixedAuthor, onSaved, onCancel }: { kind: "author" | "book"; initial?: Author | Book; authors: Author[]; fixedAuthor?: string; onSaved: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isAuthor = kind === "author";
  const fields = isAuthor
    ? [{ key: "name", label: "Nombre completo", required: true, max: 200 }, { key: "email", label: "Correo electrónico", required: true, type: "email", max: 254 }, { key: "nationality", label: "Nacionalidad", max: 100 }, { key: "birthYear", label: "Año de nacimiento", type: "number", min: -5000, max: new Date().getFullYear() }]
    : [{ key: "title", label: "Título", required: true, max: 300 }, { key: "isbn", label: "ISBN", max: 32 }, { key: "genre", label: "Género", max: 100 }, { key: "publishedYear", label: "Año de publicación", type: "number", min: -5000, max: 9999 }, { key: "pages", label: "Páginas", type: "number", min: 1, max: 1000000 }];
  const value = (key: string) => String((initial as unknown as Record<string, unknown>)?.[key] ?? "");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data: Record<string, unknown> = Object.fromEntries(new FormData(event.currentTarget));
    for (const field of fields) if (field.type === "number") data[field.key] = data[field.key] === "" ? null : Number(data[field.key]);
    try {
      await api(`/api/${isAuthor ? "authors" : "books"}${initial ? `/${initial.id}` : ""}`, { method: initial ? "PUT" : "POST", body: JSON.stringify(data) });
      onSaved();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <section className="panel border-teal-200" aria-label={isAuthor ? "Formulario de autor" : "Formulario de libro"}>
    <div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">{initial ? "Editar" : "Registrar"} {isAuthor ? "autor" : "libro"}</h2><button className="ghost" onClick={onCancel} disabled={busy}>Cerrar</button></div>
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {fields.map(field => <label key={field.key}>{field.label}{field.required ? " *" : ""}<input name={field.key} type={field.type || "text"} defaultValue={value(field.key)} required={field.required} minLength={field.key === "title" ? 3 : undefined} maxLength={field.type === "number" ? undefined : field.max} min={field.min} max={field.type === "number" ? field.max : undefined} step={field.type === "number" ? 1 : undefined} /></label>)}
      {!isAuthor && <label>Autor *<select name="authorId" required defaultValue={fixedAuthor || value("authorId")} disabled={!!fixedAuthor}><option value="">Selecciona un autor</option>{authors.map(author => <option key={author.id} value={author.id}>{author.name}</option>)}</select>{fixedAuthor && <input type="hidden" name="authorId" value={fixedAuthor} />}</label>}
      <label className="sm:col-span-2">{isAuthor ? "Biografía" : "Descripción"}<textarea name={isAuthor ? "bio" : "description"} defaultValue={value(isAuthor ? "bio" : "description")} maxLength={10000} rows={3} /></label>
      {error && <p role="alert" className="error sm:col-span-2">{error}</p>}
      <div className="flex gap-3 sm:col-span-2"><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button><button type="button" className="ghost" disabled={busy} onClick={onCancel}>Cancelar</button></div>
    </form>
  </section>;
}

export function Library({ mode, authorId }: { mode: "dashboard" | "books" | "author"; authorId?: string }) {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [author, setAuthor] = useState<Author | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<{ kind: "author" | "book"; initial?: Author | Book } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filters, setFilters] = useState({ search: "", genre: "", authorId: "", sortBy: "createdAt", order: "desc", page: 1, limit: 10 });
  const [totalBooks, setTotalBooks] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const [authorList, genreList, bookSummary] = await Promise.all([
          api<Author[]>("/api/authors", { signal: controller.signal }), api<string[]>("/api/books/genres", { signal: controller.signal }), api<{ pagination: Pagination }>("/api/books/search?limit=1", { signal: controller.signal }),
        ]);
        if (mode === "author") {
          const [detail, statistics, authorBooks] = await Promise.all([
            api<Author>(`/api/authors/${authorId}`, { signal: controller.signal }), api<Stats>(`/api/authors/${authorId}/stats`, { signal: controller.signal }), api<{ books: Book[] }>(`/api/authors/${authorId}/books`, { signal: controller.signal }),
          ]);
          if (controller.signal.aborted) return;
          setAuthor(detail); setStats(statistics); setBooks(authorBooks.books);
        }
        if (controller.signal.aborted) return;
        setAuthors(authorList); setGenres(genreList); setTotalBooks(bookSummary.pagination.total);
      } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [mode, authorId, revision]);

  useEffect(() => {
    if (mode !== "books") return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSearching(true); setSearchError("");
      try {
        const query = new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]));
        const result = await api<{ data: Book[]; pagination: Pagination }>(`/api/books/search?${query}`, { signal: controller.signal });
        if (!controller.signal.aborted) {
          if (filters.page > 1 && filters.page > Math.max(1, result.pagination.totalPages)) setFilters(f => ({ ...f, page: Math.max(1, result.pagination.totalPages) }));
          else { setBooks(result.data); setPagination(result.pagination); }
        }
      } catch (err) { if (!controller.signal.aborted) setSearchError((err as Error).message); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 300);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [mode, filters, revision]);

  function openEditor(kind: "author" | "book", initial?: Author | Book) {
    setEditor({ kind, initial }); setNotice("");
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }
  async function remove(kind: "author" | "book", item: Author | Book) {
    const title = "name" in item ? item.name : item.title;
    if (!window.confirm(`¿Eliminar «${title}»?${kind === "author" ? " También se eliminarán todos sus libros." : ""} Esta acción es permanente.`)) return;
    setDeleting(item.id); setError("");
    try { await api(`/api/${kind === "author" ? "authors" : "books"}/${item.id}`, { method: "DELETE" }); setNotice("Registro eliminado."); refresh(); }
    catch (err) { setError((err as Error).message); } finally { setDeleting(null); }
  }
  const updateFilter = (key: keyof typeof filters, value: string | number) => setFilters(previous => ({ ...previous, [key]: value, page: 1 }));
  const bookTable = <section className="panel overflow-hidden !p-0" aria-busy={searching}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><h2 className="font-semibold">{mode === "author" ? "Obras del autor" : "Catálogo de libros"}</h2><span className="badge">{mode === "author" ? books.length : pagination?.total ?? 0} resultados</span></div>
    {searching && <p role="status" className="px-5 pt-4 text-sm text-teal-700">Buscando libros…</p>}
    <div className="overflow-x-auto"><table><thead><tr><th>Libro / ISBN</th>{mode !== "author" && <th>Autor</th>}<th>Género</th><th>Año</th><th>Páginas</th><th className="text-right">Acciones</th></tr></thead><tbody>
      {books.map(book => <tr key={book.id}><td><p className="font-semibold text-slate-800">{book.title}</p><p className="mt-1 text-xs text-slate-400">{book.isbn || "Sin ISBN"}</p></td>{mode !== "author" && <td><Link className="text-teal-700 hover:underline" href={`/authors/${book.authorId}`}>{book.author?.name}</Link></td>}<td>{book.genre ? <span className="badge">{book.genre}</span> : "—"}</td><td>{book.publishedYear ?? "—"}</td><td>{book.pages ?? "—"}</td><td><div className="flex justify-end gap-2"><button className="ghost" onClick={() => openEditor("book", book)}>Editar</button><button className="danger" disabled={deleting === book.id} onClick={() => void remove("book", book)}>{deleting === book.id ? "Eliminando…" : "Eliminar"}</button></div></td></tr>)}
    </tbody></table></div>
    {!books.length && !searching && <div className="empty"><p className="font-medium">No hay libros para mostrar</p><p className="mt-2 text-sm">Registra una obra o cambia los filtros de búsqueda.</p></div>}
    {mode === "books" && pagination && <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 p-5"><p className="text-sm text-slate-500">Página {pagination.page} de {Math.max(1, pagination.totalPages)} · {pagination.total} resultados</p><div className="flex gap-2"><button className="ghost" disabled={!pagination.hasPrev || searching} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Anterior</button><button className="ghost" disabled={!pagination.hasNext || searching} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Siguiente →</button></div></div>}
  </section>;

  return <main className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-8 sm:py-12">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Biblioteca / {mode === "dashboard" ? "Vista general" : mode === "books" ? "Catálogo" : "Perfil de autor"}</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{mode === "dashboard" ? "Historias que conectan." : mode === "books" ? "Explora la colección." : author?.name || "Detalle del autor"}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{mode === "dashboard" ? "Organiza autores, descubre sus obras y construye tu biblioteca." : mode === "books" ? "Encuentra cada libro y mantén tu catálogo al día." : "Su trayectoria, sus obras y los números detrás de cada historia."}</p></div>
      <div className="flex flex-wrap gap-2">{mode === "dashboard" ? <button className="primary" disabled={loading || !!error} onClick={() => openEditor("author")}>+ Nuevo autor</button> : <><Link className="ghost" href="/">← Autores</Link><button className="primary" disabled={loading || !authors.length || !!error} onClick={() => openEditor("book")}>+ Nuevo libro</button></>}</div>
    </header>
    {error && <div role="alert" className="error flex flex-wrap items-center justify-between gap-3"><span>{error}</span><button className="ghost" onClick={refresh}>Reintentar</button></div>}
    {notice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">{notice}</p>}
    <div ref={editorRef} className="scroll-mt-6">{editor && <RecordForm key={`${editor.kind}-${editor.initial?.id || "new"}`} kind={editor.kind} initial={editor.initial} authors={authors} fixedAuthor={mode === "author" && editor.kind === "book" ? authorId : undefined} onCancel={() => setEditor(null)} onSaved={() => { setEditor(null); setNotice("Cambios guardados correctamente."); refresh(); }} />}</div>
    {loading ? <div className="panel animate-pulse py-16 text-center text-slate-500" role="status">Cargando biblioteca…</div> : !error && <>
      {mode === "dashboard" && <>
        <section className="grid gap-4 sm:grid-cols-3"><Metric title="Autores registrados" value={authors.length} detail="Voces que forman la colección" /><Metric title="Libros en la biblioteca" value={totalBooks} detail="Obras almacenadas en PostgreSQL" /><Metric title="Géneros literarios" value={genres.length} detail="Diferentes formas de contar historias" /></section>
        <section><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Nuestros autores <span className="ml-2 text-sm font-normal text-slate-400">{authors.length}</span></h2><Link className="text-sm font-semibold text-teal-700" href="/books">Ver todos los libros →</Link></div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{authors.map((item, index) => <article key={item.id} className="panel flex flex-col"><div className="mb-5 flex items-start justify-between"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-semibold ${index % 2 ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"}`}>{item.name.split(" ").slice(0, 2).map(part => part[0]).join("")}</div><span className="badge">{item._count?.books ?? 0} libros</span></div><h3 className="text-lg font-semibold">{item.name}</h3><p className="mt-1 break-all text-sm text-slate-500">{item.email}</p><p className="mt-4 text-sm text-slate-500">{item.nationality || "Nacionalidad sin registrar"}{item.birthYear ? ` · ${item.birthYear}` : ""}</p><p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{item.bio || "Añade una biografía para conocer su historia."}</p><div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Link className="ghost mr-auto" href={`/authors/${item.id}`}>Ver libros →</Link><button className="ghost" onClick={() => openEditor("author", item)}>Editar</button><button className="danger" disabled={deleting === item.id} onClick={() => void remove("author", item)}>{deleting === item.id ? "Eliminando…" : "Eliminar"}</button></div></article>)}</div>
          {!authors.length && <div className="panel empty"><h3 className="text-lg font-semibold">Tu biblioteca comienza con un autor</h3><p className="mb-5 mt-2 text-sm">Registra el primero para empezar a añadir sus libros.</p><button className="primary" onClick={() => openEditor("author")}>Registrar autor</button></div>}
        </section>
      </>}
      {mode === "books" && <>
        {!authors.length && <p className="panel text-sm text-slate-600">Primero <Link href="/" className="text-teal-700 underline">registra un autor</Link> para poder añadir libros.</p>}
        <section className="panel grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="sm:col-span-2">Buscar por título<input type="search" placeholder="Escribe el título de un libro…" value={filters.search} onChange={event => updateFilter("search", event.target.value)} /></label><label>Género<select value={filters.genre} onChange={event => updateFilter("genre", event.target.value)}><option value="">Todos los géneros</option>{genres.map(genre => <option key={genre}>{genre}</option>)}</select></label><label>Autor<select value={filters.authorId} onChange={event => updateFilter("authorId", event.target.value)}><option value="">Todos los autores</option>{authors.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ordenar por<select value={filters.sortBy} onChange={event => updateFilter("sortBy", event.target.value)}><option value="createdAt">Fecha de registro</option><option value="title">Título</option><option value="publishedYear">Año de publicación</option></select></label><label>Orden<select value={filters.order} onChange={event => updateFilter("order", event.target.value)}><option value="desc">Descendente</option><option value="asc">Ascendente</option></select></label><label>Resultados por página<select value={filters.limit} onChange={event => updateFilter("limit", Number(event.target.value))}>{[5, 10, 20, 50].map(limit => <option key={limit} value={limit}>{limit}</option>)}</select></label><button className="ghost self-end" onClick={() => setFilters({ search: "", genre: "", authorId: "", sortBy: "createdAt", order: "desc", page: 1, limit: 10 })}>Limpiar filtros</button></section>
        {searchError ? <div className="error" role="alert">{searchError} <button className="ghost" onClick={refresh}>Reintentar</button></div> : bookTable}
      </>}
      {mode === "author" && author && stats && <>
        <section className="panel"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="badge">{author.nationality || "Sin nacionalidad"}</span><h2 className="mt-4 text-2xl font-semibold">{author.name}</h2><p className="mt-2 break-all text-sm text-slate-500">{author.email} · Nacimiento: {author.birthYear ?? "Sin registrar"}</p></div><button className="ghost" onClick={() => openEditor("author", author)}>Editar información</button></div><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{author.bio || "Este autor aún no tiene una biografía registrada."}</p></section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric title="Libros publicados" value={stats.totalBooks} detail="Total de obras registradas" /><Metric title="Promedio de páginas" value={stats.averagePages ?? "—"} detail="Solo libros con páginas registradas" /><Metric title="Primera publicación" value={stats.firstBook?.year ?? "—"} detail={stats.firstBook?.title || "Sin año registrado"} /><Metric title="Última publicación" value={stats.latestBook?.year ?? "—"} detail={stats.latestBook?.title || "Sin año registrado"} /></section>
        <section className="grid gap-4 md:grid-cols-3"><div className="panel"><h3 className="text-sm text-slate-500">Géneros del autor</h3><div className="mt-4 flex flex-wrap gap-2">{stats.genres.length ? stats.genres.map(genre => <span className="badge" key={genre}>{genre}</span>) : <span className="text-sm">Sin géneros registrados</span>}</div></div><Metric title="Libro más extenso" value={stats.longestBook ? `${stats.longestBook.pages} pág.` : "—"} detail={stats.longestBook?.title || "Sin páginas registradas"} /><Metric title="Libro más breve" value={stats.shortestBook ? `${stats.shortestBook.pages} pág.` : "—"} detail={stats.shortestBook?.title || "Sin páginas registradas"} /></section>
        {bookTable}
      </>}
    </>}
  </main>;
}
