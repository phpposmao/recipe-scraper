import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium-min"
import type { Recipe } from "./types"

// Simple in-memory cache
const cache = new Map()
const CACHE_TTL = 3600000 // 1 hour in milliseconds

export async function searchRecipes(query: string): Promise<Recipe[]> {
  // Check cache first
  const cacheKey = query.toLowerCase()
  const cachedResult = cache.get(cacheKey)

  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
    return cachedResult.data
  }

  try {

    const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar')

    // Launch a headless browser using @sparticuz/chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });
    const page = await browser.newPage()

    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    )

    // Navigate to Google search
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query + " recipe")}`)

    // Get recipe links from search results
    const recipeLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"))
      return links
        .filter((link) => {
          const href = link.href
          // Filter for recipe sites
          return (
            href.includes("recipe") ||
            href.includes("allrecipes.com") ||
            href.includes("foodnetwork.com") ||
            href.includes("epicurious.com") ||
            href.includes("simplyrecipes.com") ||
            href.includes("receitas.com") ||
            href.includes("tudogostoso.com.br") ||
            href.includes("receitasnestle.com.br") ||
            href.includes("panelinha.com.br")
          )
        })
        .map((link) => link.href)
        .slice(0, 5) // Limit to first 5 recipe links
    })

    const recipes: Recipe[] = []

    // Visit each recipe page and extract content
    for (const link of recipeLinks) {
      try {
        await page.goto(link, { waitUntil: "domcontentloaded", timeout: 15000 })

        // Extract recipe information using the appropriate extractor
        const recipe = await page.evaluate((url) => {
          // Get the appropriate extractor based on the URL
          const isAllrecipes = url.includes("allrecipes.com")
          const isFoodNetwork = url.includes("foodnetwork.com")

          // This function would normally be imported from extractors/index.ts
          // but we need to redefine it here since we can't import in evaluate
          function getExtractor() {
            if (isAllrecipes) {
              // Allrecipes extractor logic
              return () => {
                // Try to extract structured data first (JSON-LD)
                const structuredData = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                  .map((script) => {
                    try {
                      return JSON.parse(script.textContent || "{}")
                    } catch {
                      return {}
                    }
                  })
                  .find((data) => data["@type"] === "Recipe")

                if (structuredData) {
                  return {
                    title: structuredData.name || "Unknown Recipe",
                    ingredients: Array.isArray(structuredData.recipeIngredient) ? structuredData.recipeIngredient : [],
                    instructions: Array.isArray(structuredData.recipeInstructions)
                      ? structuredData.recipeInstructions.map((step: { text: any }) =>
                          typeof step === "string" ? step : step.text || "",
                        )
                      : [],
                    sourceName: window.location.hostname.replace("www.", ""),
                    sourceUrl: window.location.href,
                  }
                }

                // Fallback to DOM scraping if structured data isn't available

                // Get title - Allrecipes usually has the title in an h1 with a specific class
                const title =
                  document.querySelector("h1.article-heading")?.textContent?.trim() ||
                  document.querySelector("h1.recipe-title")?.textContent?.trim() ||
                  document.querySelector("h1")?.textContent?.trim() ||
                  "Unknown Recipe"

                // Get ingredients - Allrecipes usually has ingredients in specific elements
                const ingredientElements = Array.from(
                  document.querySelectorAll(".ingredients-item-name, .ingredients-item, .checklist__item"),
                )

                const ingredients = ingredientElements
                  .map((el) => el.textContent?.trim())
                  .filter((text) => text && text.length < 100) // Filter out non-ingredient text
                  .filter(Boolean)

                // Get instructions - Allrecipes usually has instructions in specific elements
                const instructionElements = Array.from(
                  document.querySelectorAll(".instructions-section-item, .recipe-directions__list--item, .step"),
                )

                const instructions = instructionElements.map((el) => el.textContent?.trim()).filter(Boolean)

                return {
                  title,
                  ingredients,
                  instructions,
                  sourceName: window.location.hostname.replace("www.", ""),
                  sourceUrl: window.location.href,
                }
              }
            } else if (isFoodNetwork) {
              // Food Network extractor logic
              return () => {
                // Similar implementation as allrecipes but with Food Network specific selectors
                // Try to extract structured data first (JSON-LD)
                const structuredData = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                  .map((script) => {
                    try {
                      return JSON.parse(script.textContent || "{}")
                    } catch {
                      return {}
                    }
                  })
                  .find((data) => {
                    return (
                      data["@type"] === "Recipe" ||
                      (Array.isArray(data["@graph"]) && data["@graph"].some((item) => item["@type"] === "Recipe"))
                    )
                  })

                if (structuredData) {
                  // Handle both direct Recipe and @graph containing Recipe
                  const recipeData =
                    structuredData["@type"] === "Recipe"
                      ? structuredData
                      : structuredData["@graph"].find((item: { [x: string]: string }) => item["@type"] === "Recipe")

                  if (recipeData) {
                    return {
                      title: recipeData.name || "Unknown Recipe",
                      ingredients: Array.isArray(recipeData.recipeIngredient) ? recipeData.recipeIngredient : [],
                      instructions: Array.isArray(recipeData.recipeInstructions)
                        ? recipeData.recipeInstructions.map((step: { text: any }) =>
                            typeof step === "string" ? step : step.text || "",
                          )
                        : [],
                      sourceName: window.location.hostname.replace("www.", ""),
                      sourceUrl: window.location.href,
                    }
                  }
                }

                // Fallback to DOM scraping if structured data isn't available

                // Get title - Food Network usually has the title in specific elements
                const title =
                  document
                    .querySelector(".o-AssetTitle__a-Headline, .recipe-title, .title-wrap h1")
                    ?.textContent?.trim() ||
                  document.querySelector("h1")?.textContent?.trim() ||
                  "Unknown Recipe"

                // Get ingredients - Food Network usually has ingredients in specific elements
                const ingredientElements = Array.from(
                  document.querySelectorAll(".o-Ingredients__a-Ingredient, .ingredients li, .ingredient-list li"),
                )

                const ingredients = ingredientElements
                  .map((el) => el.textContent?.trim())
                  .filter((text) => text && text.length < 100) // Filter out non-ingredient text
                  .filter(Boolean)

                // Get instructions - Food Network usually has instructions in specific elements
                const instructionElements = Array.from(
                  document.querySelectorAll(".o-Method__m-Step, .direction-lists li, .recipe-directions-list li"),
                )

                const instructions = instructionElements.map((el) => el.textContent?.trim()).filter(Boolean)

                return {
                  title,
                  ingredients,
                  instructions,
                  sourceName: window.location.hostname.replace("www.", ""),
                  sourceUrl: window.location.href,
                }
              }
            } else {
              // Default extractor logic
              return () => {
                // Try to extract structured data first (JSON-LD)
                const structuredData = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                  .map((script) => {
                    try {
                      return JSON.parse(script.textContent || "{}")
                    } catch {
                      return {}
                    }
                  })
                  .find((data) => {
                    return (
                      data["@type"] === "Recipe" ||
                      (Array.isArray(data["@graph"]) && data["@graph"].some((item) => item["@type"] === "Recipe"))
                    )
                  })

                if (structuredData) {
                  // Handle both direct Recipe and @graph containing Recipe
                  const recipeData =
                    structuredData["@type"] === "Recipe"
                      ? structuredData
                      : structuredData["@graph"]?.find((item: { [x: string]: string }) => item["@type"] === "Recipe")

                  if (recipeData) {
                    return {
                      title: recipeData.name || "Unknown Recipe",
                      ingredients: Array.isArray(recipeData.recipeIngredient) ? recipeData.recipeIngredient : [],
                      instructions: Array.isArray(recipeData.recipeInstructions)
                        ? recipeData.recipeInstructions.map((step: { text: any }) =>
                            typeof step === "string" ? step : step.text || "",
                          )
                        : [],
                      sourceName: window.location.hostname.replace("www.", ""),
                      sourceUrl: window.location.href,
                    }
                  }
                }

                // Fallback to DOM scraping if structured data isn't available

                // Try to find recipe title with various common selectors
                const titleSelectors = [
                  "h1.recipe-title",
                  "h1.entry-title",
                  "h1.post-title",
                  'h1[itemprop="name"]',
                  ".recipe-title",
                  ".recipe-header h1",
                  "h1",
                ]

                let title = "Unknown Recipe"
                for (const selector of titleSelectors) {
                  const titleElement = document.querySelector(selector)
                  if (titleElement && titleElement.textContent) {
                    title = titleElement.textContent.trim()
                    break
                  }
                }

                // Try to find ingredients with various common selectors
                const ingredientSelectors = [
                  '[itemprop="recipeIngredient"]',
                  ".ingredients li",
                  ".ingredient-list li",
                  ".recipe-ingredients li",
                  ".wprm-recipe-ingredient",
                  ".ingredient",
                  "ul li", // Last resort, may capture non-ingredients
                ]

                let ingredientElements: any[] = []
                for (const selector of ingredientSelectors) {
                  const elements = Array.from(document.querySelectorAll(selector))
                  if (elements.length > 0) {
                    ingredientElements = elements
                    break
                  }
                }

                const ingredients = ingredientElements
                  .map((el) => el.textContent?.trim())
                  .filter((text) => text && text.length < 100) // Filter out non-ingredient text
                  .filter(Boolean)

                // Try to find instructions with various common selectors
                const instructionSelectors = [
                  '[itemprop="recipeInstructions"] li',
                  ".instructions li",
                  ".recipe-directions li",
                  ".recipe-instructions li",
                  ".preparation-steps li",
                  ".wprm-recipe-instruction",
                  ".recipe-method li",
                  "ol li", // Last resort, may capture non-instructions
                ]

                let instructionElements: any[] = []
                for (const selector of instructionSelectors) {
                  const elements = Array.from(document.querySelectorAll(selector))
                  if (elements.length > 0) {
                    instructionElements = elements
                    break
                  }
                }

                // If we didn't find list items, try paragraph-based instructions
                if (instructionElements.length === 0) {
                  const paragraphSelectors = [
                    '[itemprop="recipeInstructions"] p',
                    ".instructions p",
                    ".recipe-directions p",
                    ".recipe-instructions p",
                    ".preparation-steps p",
                    ".wprm-recipe-instruction-text",
                    ".recipe-method p",
                  ]

                  for (const selector of paragraphSelectors) {
                    const elements = Array.from(document.querySelectorAll(selector))
                    if (elements.length > 0) {
                      instructionElements = elements
                      break
                    }
                  }
                }

                const instructions = instructionElements.map((el) => el.textContent?.trim()).filter(Boolean)

                return {
                  title,
                  ingredients,
                  instructions,
                  sourceName: window.location.hostname.replace("www.", ""),
                  sourceUrl: window.location.href,
                }
              }
            }
          }

          // Get the appropriate extractor and execute it
          const extractor = getExtractor()
          return extractor()
        }, link)

        recipes.push(recipe)
      } catch (error) {
        console.error(`Error scraping recipe from ${link}:`, error)
        // Continue with next link
      }
    }

    await browser.close()

    // Store in cache
    cache.set(cacheKey, {
      data: recipes,
      timestamp: Date.now(),
    })

    return recipes
  } catch (error) {
    console.error("Error in searchRecipes:", error)
    return []
  }
}

