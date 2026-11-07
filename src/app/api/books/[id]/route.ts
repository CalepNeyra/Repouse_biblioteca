import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, bookData, body, handleError, RouteContext } from "@/lib/api";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const book = await prisma.book.findUnique({ where: { id: (await context.params).id }, include: { author: true } });
    if (!book) throw new ApiError(404, "Libro no encontrado.");
    return NextResponse.json(book);
  } catch (error) { return handleError(error); }
}
export async function PUT(request: Request, context: RouteContext) {
  try {
    const data = bookData(await body(request), true);
    if (data.authorId && !await prisma.author.findUnique({ where: { id: data.authorId }, select: { id: true } })) throw new ApiError(404, "El autor indicado no existe.");
    return NextResponse.json(await prisma.book.update({ where: { id: (await context.params).id }, data, include: { author: true } }));
  } catch (error) { return handleError(error); }
}
export async function DELETE(_request: Request, context: RouteContext) {
  try { await prisma.book.delete({ where: { id: (await context.params).id } }); return NextResponse.json({ message: "Libro eliminado correctamente" }); }
  catch (error) { return handleError(error); }
}
