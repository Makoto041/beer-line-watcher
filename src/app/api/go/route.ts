import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

/**
 * Short URL redirect API
 * /api/go?id=xxx → Redirect to event URL
 *
 * This allows LINE messages to use short URLs that won't break
 * when the message is displayed.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get("id");

  if (!eventId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { url: true },
    });

    if (!event) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.redirect(event.url);
  } catch (error) {
    console.error("Redirect error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
