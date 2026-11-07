import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return NextResponse.json({ error: "El correo o ISBN ya está registrado." }, { status: 409 });
    if (error.code === "P2025") return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
    if (error.code === "P2003") return NextResponse.json({ error: "El autor indicado no existe." }, { status: 400 });
  }
  // Never return or log database errors: they may contain connection credentials.
  return NextResponse.json({ error: "No se pudo completar la operación. Verifica la conexión con la base de datos." }, { status: 503 });
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try { value = await request.json(); } catch { throw new ApiError(400, "El cuerpo debe ser JSON válido."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "Se esperaba un objeto JSON.");
  return value as Record<string, unknown>;
}

function text(data: Record<string, unknown>, key: string, required = false, max = 500) {
  const value = data[key];
  if (value === undefined) { if (required) throw new ApiError(400, `${key} es obligatorio.`); return undefined; }
  if (value === null && !required) return null;
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new ApiError(400, `${key} debe ser texto válido (máximo ${max} caracteres).`);
  return value.trim() || null;
}

function integer(data: Record<string, unknown>, key: string, min: number, max: number) {
  const value = data[key];
  if (value === undefined || value === null) return value;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new ApiError(400, `${key} debe ser un entero entre ${min} y ${max}.`);
  return value;
}

export function authorData(data: Record<string, unknown>, partial = false) {
  if (partial && !["name", "email", "bio", "nationality", "birthYear"].some(k => k in data)) throw new ApiError(400, "Incluye al menos un campo del autor.");
  const name = text(data, "name", !partial || "name" in data, 200) ?? undefined;
  const email = text(data, "email", !partial || "email" in data, 254) ?? undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "El correo electrónico no es válido.");
  return { name, email: email?.toLowerCase(), bio: text(data, "bio", false, 10000), nationality: text(data, "nationality", false, 100), birthYear: integer(data, "birthYear", -5000, new Date().getFullYear()) };
}

export function bookData(data: Record<string, unknown>, partial = false) {
  if (partial && !["title", "description", "isbn", "publishedYear", "genre", "pages", "authorId"].some(k => k in data)) throw new ApiError(400, "Incluye al menos un campo del libro.");
  const title = text(data, "title", !partial || "title" in data, 300) ?? undefined;
  if (title !== undefined && title.length < 3) throw new ApiError(400, "El título debe tener al menos 3 caracteres.");
  return {
    title,
    authorId: text(data, "authorId", !partial || "authorId" in data, 200) ?? undefined,
    description: text(data, "description", false, 10000), isbn: text(data, "isbn", false, 32),
    genre: text(data, "genre", false, 100), publishedYear: integer(data, "publishedYear", -5000, 9999), pages: integer(data, "pages", 1, 1000000),
  };
}

export type RouteContext = { params: Promise<{ id: string }> };

export function searchOptions(params: URLSearchParams) {
  const number = (key: string, fallback: number, max: number) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1 || Number(raw) > max) throw new ApiError(400, `${key} debe ser un entero entre 1 y ${max}.`);
    return Number(raw);
  };
  const page = number("page", 1, 1000000);
  const limit = number("limit", 10, 50);
  const sortBy = params.get("sortBy") ?? "createdAt";
  const order = params.get("order") ?? "desc";
  if (!["title", "publishedYear", "createdAt"].includes(sortBy)) throw new ApiError(400, "sortBy debe ser title, publishedYear o createdAt.");
  if (order !== "asc" && order !== "desc") throw new ApiError(400, "order debe ser asc o desc.");
  const where: Prisma.BookWhereInput = {};
  if (params.get("search")) where.title = { contains: params.get("search")!, mode: "insensitive" };
  if (params.get("genre")) where.genre = params.get("genre")!;
  if (params.get("authorName")) where.author = { name: { contains: params.get("authorName")!, mode: "insensitive" } };
  if (params.get("authorId")) where.authorId = params.get("authorId")!;
  const orderBy: Prisma.BookOrderByWithRelationInput[] = [{ [sortBy]: order }, { id: "asc" }];
  return { page, limit, where, orderBy };
}
