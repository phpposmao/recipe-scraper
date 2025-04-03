import RecipeSearch from "@/components/recipe-search"
import { SearchResults } from "@/components/search-results"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Recipe Finder</h1>
      <RecipeSearch />
      <SearchResults />
    </main>
  )
}

