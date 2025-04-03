import { searchRecipes } from "@/lib/search-recipes"
import RecipeCard from "./recipe-card"

export async function SearchResults({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const query = searchParams?.q || ""

  if (!query) {
    return <div className="text-center text-muted-foreground mt-12">Search for recipes to get started</div>
  }

  try {
    const recipes = await searchRecipes(query)

    if (recipes.length === 0) {
      return <div className="text-center text-muted-foreground mt-12">No recipes found for "{query}"</div>
    }

    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Results for "{query}"</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe, index) => (
            <RecipeCard key={index} recipe={recipe} />
          ))}
        </div>
      </div>
    )
  } catch (error) {
    return <div className="text-center text-red-500 mt-12">Error searching for recipes. Please try again later.</div>
  }
}

