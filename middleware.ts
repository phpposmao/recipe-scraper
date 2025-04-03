import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams
  const q = searchParams.get("q")

  // If there's a search query in the URL, hydrate the SearchResults component
  if (q) {
    const url = new URL(request.url)
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/",
}

