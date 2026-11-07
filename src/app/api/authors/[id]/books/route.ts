import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleError, RouteContext } from "@/lib/api";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const author = await prisma.author.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!author) throw new ApiError(404, "Autor no encontrado.");
    const books = await prisma.book.findMany({ where: { authorId: id }, orderBy: [{ publishedYear: "desc" }, { id: "asc" }] });
    return NextResponse.json({ author, totalBooks: books.length, books });
  } catch (error) { return handleError(error); }
}
