import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorData, body, handleError } from "@/lib/api";

export async function GET() {
  try { return NextResponse.json(await prisma.author.findMany({ include: { books: true, _count: { select: { books: true } } }, orderBy: [{ name: "asc" }, { id: "asc" }] })); }
  catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const data = authorData(await body(request));
    return NextResponse.json(await prisma.author.create({ data: { ...data, name: data.name!, email: data.email! }, include: { books: true } }), { status: 201 });
  } catch (error) { return handleError(error); }
}
