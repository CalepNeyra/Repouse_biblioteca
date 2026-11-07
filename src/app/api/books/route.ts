import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, bookData, body, handleError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await prisma.book.findMany({ where: { genre: params.get("genre") || undefined, authorId: params.get("authorId") || undefined }, include: { author: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] }));
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const data = bookData(await body(request));
    if (!await prisma.author.findUnique({ where: { id: data.authorId! }, select: { id: true } })) throw new ApiError(404, "El autor indicado no existe.");
    return NextResponse.json(await prisma.book.create({ data: { ...data, title: data.title!, authorId: data.authorId! }, include: { author: true } }), { status: 201 });
  } catch (error) { return handleError(error); }
}
