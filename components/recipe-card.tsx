import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Recipe } from "@/lib/types"

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{recipe.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {recipe.ingredients && (
          <div className="mb-4">
            <h3 className="font-medium mb-2">Ingredients:</h3>
            <ul className="list-disc pl-5 space-y-1">
              {recipe.ingredients.map((ingredient, i) => (
                <li key={i} className="text-sm">
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>
        )}
        {recipe.instructions && (
          <div>
            <h3 className="font-medium mb-2">Instructions:</h3>
            <ol className="list-decimal pl-5 space-y-2">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="text-sm">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground border-t pt-4">
        Source:{" "}
        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline ml-1">
          {recipe.sourceName}
        </a>
      </CardFooter>
    </Card>
  )
}

