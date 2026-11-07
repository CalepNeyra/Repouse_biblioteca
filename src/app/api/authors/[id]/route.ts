import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, authorData, body, handleError, RouteContext } from "@/lib/api";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const author = await prisma.author.findUnique({ where: { id: (await context.params).id }, include: { books: { orderBy: { publishedYear: "desc" } }, _count: { select: { books: true } } } });
    if (!author) throw new ApiError(404, "Autor no encontrado.");
    return NextResponse.json(author);
  } catch (error) { return handleError(error); }
}
export async function PUT(request: Request, context: RouteContext) {
  try { return NextResponse.json(await prisma.author.update({ where: { id: (await context.params).id }, data: authorData(await body(request), true), include: { books: true } })); }
  catch (error) { return handleError(error); }
}
export async function DELETE(_request: Request, context: RouteContext) {
  try { await prisma.author.delete({ where: { id: (await context.params).id } }); return NextResponse.json({ message: "Autor eliminado correctamente" }); }
  catch (error) { return handleError(error); }
}
