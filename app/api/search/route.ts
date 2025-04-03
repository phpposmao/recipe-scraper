import { type NextRequest, NextResponse } from "next/server"
import { searchRecipes } from "@/lib/search-recipes"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  try {
    const recipes = await searchRecipes(query)
    return NextResponse.json({ recipes })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json({ error: "Failed to search recipes" }, { status: 500 })
  }
}

