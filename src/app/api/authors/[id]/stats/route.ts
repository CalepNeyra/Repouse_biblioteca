import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleError, RouteContext } from "@/lib/api";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const author = await prisma.author.findUnique({ where: { id: (await context.params).id }, include: { books: { orderBy: { id: "asc" } } } });
    if (!author) throw new ApiError(404, "Autor no encontrado.");
    const byYear = author.books.filter(b => b.publishedYear !== null).sort((a, b) => a.publishedYear! - b.publishedYear!);
    const byPages = author.books.filter(b => b.pages !== null).sort((a, b) => a.pages! - b.pages!);
    const year = (b: (typeof byYear)[number] | undefined) => b ? { title: b.title, year: b.publishedYear } : null;
    const pages = (b: (typeof byPages)[number] | undefined) => b ? { title: b.title, pages: b.pages } : null;
    return NextResponse.json({
      authorId: author.id, authorName: author.name, totalBooks: author.books.length,
      firstBook: year(byYear[0]), latestBook: year(byYear.at(-1)),
      averagePages: byPages.length ? Math.round(byPages.reduce((sum, b) => sum + b.pages!, 0) / byPages.length * 100) / 100 : null,
      genres: [...new Set(author.books.map(b => b.genre).filter((g): g is string => !!g))].sort(),
      longestBook: pages(byPages.at(-1)), shortestBook: pages(byPages[0]),
    });
  } catch (error) { return handleError(error); }
}
