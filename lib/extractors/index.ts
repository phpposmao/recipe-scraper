import { allrecipesExtractor } from "./allrecipes"
import { foodnetworkExtractor } from "./foodnetwork"
import { defaultExtractor } from "./default"

export function getExtractor(url: string) {
  if (url.includes("allrecipes.com")) return allrecipesExtractor
  if (url.includes("foodnetwork.com")) return foodnetworkExtractor
  return defaultExtractor
}

