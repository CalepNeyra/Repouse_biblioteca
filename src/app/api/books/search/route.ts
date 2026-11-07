import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, searchOptions } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { page, limit, where, orderBy } = searchOptions(new URL(request.url).searchParams);
    const [data, total] = await prisma.$transaction([
      prisma.book.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { author: true } }),
      prisma.book.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data, pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } });
  } catch (error) { return handleError(error); }
}
