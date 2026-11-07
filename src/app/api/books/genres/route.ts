import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/api";

export async function GET() {
  try {
    const rows = await prisma.book.findMany({ distinct: ["genre"], where: { genre: { not: null } }, select: { genre: true }, orderBy: { genre: "asc" } });
    return NextResponse.json(rows.map(row => row.genre));
  } catch (error) { return handleError(error); }
}
