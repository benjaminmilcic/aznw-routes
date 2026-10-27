import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, from, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Recipe, RecipeWithoutId } from './recipes.model';
import { francAll } from 'franc-min';

export type SupportedLanguage = 'de' | 'en' | 'hr';

export interface TranslatedRecipe extends Recipe {
  detectedLanguage?: string;
  targetLanguage?: SupportedLanguage;
}

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
  };
  responseStatus: number;
  responseDetails?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RecipesService {
  environment = environment;
  changeRoute = new Subject<{ route: string; id: number | null }>();

  private readonly MYMEMORY_API = 'https://api.mymemory.translated.net/get';
  private readonly CACHE_KEY_PREFIX = 'recipe_translation_';
  private readonly CACHE_EXPIRY_DAYS = 30;

  // Mapping from franc ISO 639-3 to ISO 639-1 (MyMemory API)
  // Note: South Slavic languages are very similar and often confused
  private readonly langMap: { [key: string]: SupportedLanguage } = {
    deu: 'de',
    eng: 'en',
    hrv: 'hr',
    srp: 'hr', // Serbian -> treat as Croatian (similar languages)
    bos: 'hr', // Bosnian -> treat as Croatian
    hbs: 'hr', // Serbo-Croatian -> treat as Croatian
    slv: 'hr', // Slovenian -> treat as Croatian (South Slavic language)
  };

  constructor(private http: HttpClient) {}

  getRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(this.environment.recipes.recipesApi);
  }

  addRecipe(recipe: RecipeWithoutId): Observable<Recipe> {
    return this.http.post<Recipe>(this.environment.recipes.recipesApi, recipe);
  }

  deleteRecipe(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.environment.recipes.recipesApi}/${id}`
    );
  }

  updateRecipe(id: number, recipe: RecipeWithoutId): Observable<Recipe> {
    return this.http.put<Recipe>(
      `${this.environment.recipes.recipesApi}/${id}`,
      recipe
    );
  }

  /**
   * Detects the language of a text
   * @param text The text to analyze
   * @returns Language code (de, en, hr) or 'unknown'
   */
  detectLanguage(text: string): SupportedLanguage | 'unknown' {
    if (!text || text.trim().length < 10) {
      return 'unknown';
    }

    try {
      const detected = francAll(text, { minLength: 3 });

      if (detected.length === 0 || detected[0][0] === 'und') {
        return 'unknown';
      }

      const detectedLang = detected[0][0]; // ISO 639-3 code (e.g. 'deu')
      const mappedLang = this.langMap[detectedLang];

      return mappedLang || 'unknown';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'unknown';
    }
  }

  /**
   * Translates a recipe into the target language
   * @param recipe The recipe to translate
   * @param targetLang Target language (de, en, hr)
   * @returns Observable with the translated recipe
   */
  translateRecipe(
    recipe: Recipe,
    targetLang: SupportedLanguage
  ): Observable<TranslatedRecipe> {
    // Check the cache
    const cached = this.getCachedTranslation(recipe.id, targetLang);
    if (cached) {
      return of(cached);
    }

    // Detect the source language
    const sourceLang = this.detectLanguage(recipe.preparation);

    if (sourceLang === 'unknown') {
      console.warn('Could not detect language, defaulting to English');
      return of({
        ...recipe,
        detectedLanguage: 'unknown',
        targetLanguage: targetLang,
      });
    }

    if (sourceLang === targetLang) {
      // No translation needed
      return of({
        ...recipe,
        detectedLanguage: sourceLang,
        targetLanguage: targetLang,
      });
    }

    // Translate all fields in parallel
    const title$ = this.translateText(recipe.title, sourceLang, targetLang);
    const preparation$ = this.translateText(
      recipe.preparation,
      sourceLang,
      targetLang
    );

    // Translate all ingredients
    const ingredients$ = forkJoin(
      recipe.ingredients.map((ingredient) =>
        this.translateText(ingredient, sourceLang, targetLang)
      )
    );

    return forkJoin({
      title: title$,
      preparation: preparation$,
      ingredients: ingredients$,
    }).pipe(
      map((translations) => {
        const translatedRecipe: TranslatedRecipe = {
          ...recipe,
          title: translations.title,
          preparation: translations.preparation,
          ingredients: translations.ingredients,
          detectedLanguage: sourceLang,
          targetLanguage: targetLang,
        };

        // Store in the cache
        this.cacheTranslation(recipe.id, targetLang, translatedRecipe);

        return translatedRecipe;
      })
      // ❌ Removed: catchError is removed so that errors are passed through to the component
      // catchError((error) => {
      //   console.error('Translation error:', error);
      //   return of({
      //     ...recipe,
      //     detectedLanguage: sourceLang,
      //     targetLanguage: targetLang,
      //   });
      // })
    );
  }

  /**
   * Translates a single text with the MyMemory API
   * @param text Text to translate
   * @param sourceLang Source language
   * @param targetLang Target language
   * @returns Observable with the translated text
   */
  private translateText(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Observable<string> {
    if (!text || text.trim().length === 0) {
      return of(text);
    }

    const MAX_CHARS = 450; // Safety margin below the 500-character limit

    // If the text is short enough, translate it directly
    if (text.length <= MAX_CHARS) {
      return this.translateTextChunk(text, sourceLang, targetLang);
    }

    // Split the text into chunks
    const chunks = this.splitTextIntoChunks(text, MAX_CHARS);

    // Translate all chunks in parallel
    const translations$ = chunks.map((chunk) =>
      this.translateTextChunk(chunk.text, sourceLang, targetLang)
    );

    // Join all translations with the original separators
    return forkJoin(translations$).pipe(
      map((translatedChunks) => {
        let result = '';
        translatedChunks.forEach((translated, idx) => {
          result += translated;
          if (idx < chunks.length - 1) {
            // Use the original separator (can be \n or a space)
            result += chunks[idx].separator || ' ';
          }
        });
        return result;
      })
    );
  }

  /**
   * Splits a text into chunks that are separated at sentence boundaries
   * @param text The text to split
   * @param maxLength Maximum length per chunk
   * @returns Array of objects with text chunks and the following separator
   */
  private splitTextIntoChunks(
    text: string,
    maxLength: number
  ): Array<{ text: string; separator: string }> {
    const chunks: Array<{ text: string; separator: string }> = [];
    let currentChunk = '';
    let chunkSeparator = '';

    // Split the text at all whitespace boundaries and keep the separators
    const parts = text.split(/(\s+)/);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Skip empty parts
      if (!part) continue;

      // Is it a separator (spaces/line breaks)?
      if (/^\s+$/.test(part)) {
        // Add the separator to the current chunk
        chunkSeparator += part;
        continue;
      }

      // It is a text part (word or phrase)
      const word = part;

      // Check whether the word fits into the current chunk
      const wouldBeLength =
        currentChunk.length + chunkSeparator.length + word.length;

      if (wouldBeLength <= maxLength || !currentChunk) {
        // Add to the current chunk
        currentChunk += chunkSeparator + word;
        chunkSeparator = '';
      } else {
        // Chunk is full - store it with the collected separator
        chunks.push({
          text: currentChunk,
          separator: chunkSeparator,
        });

        // Start a new chunk with the current word
        currentChunk = word;
        chunkSeparator = '';
      }
    }

    // Add the last chunk
    if (currentChunk) {
      chunks.push({
        text: currentChunk,
        separator: chunkSeparator,
      });
    }

    return chunks;
  }

  /**
   * Translates a single text chunk with the MyMemory API
   * @param text Text chunk to translate
   * @param sourceLang Source language
   * @param targetLang Target language
   * @returns Observable with the translated text
   */
  private translateTextChunk(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Observable<string> {
    // The MyMemory API uses GET with query parameters
    const langPair = `${sourceLang}|${targetLang}`;
    const email = this.environment.recipes.translationEmail || '';
    const url = `${this.MYMEMORY_API}?q=${encodeURIComponent(
      text
    )}&langpair=${langPair}&de=${encodeURIComponent(email)}`;

    return this.http.get<MyMemoryResponse>(url).pipe(
      map((response) => {
        if (response.responseStatus === 200) {
          return response.responseData.translatedText;
        } else if (response.responseStatus === 403) {
          // Rate limit reached
          throw new Error('TRANSLATION_RATE_LIMIT_EXCEEDED');
        } else if (response.responseStatus === 429) {
          // Too many requests
          throw new Error('TRANSLATION_TOO_MANY_REQUESTS');
        } else {
          console.warn('Translation API warning:', response.responseDetails);
          throw new Error('TRANSLATION_API_ERROR');
        }
      }),
      catchError((error) => {
        console.error('Translation API error:', error);

        // Pass on specific errors
        if (error.message?.startsWith('TRANSLATION_')) {
          throw error;
        }

        // Network error
        if (error.status === 0) {
          throw new Error('TRANSLATION_NETWORK_ERROR');
        }

        // Other errors
        throw new Error('TRANSLATION_UNKNOWN_ERROR');
      })
    );
  }

  /**
   * Gets a translated recipe from the cache
   */
  private getCachedTranslation(
    recipeId: number,
    targetLang: SupportedLanguage
  ): TranslatedRecipe | null {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${recipeId}_${targetLang}`;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);
      const now = new Date().getTime();
      const expiryTime = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      if (now - data.timestamp > expiryTime) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return data.recipe;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Stores a translated recipe in the cache
   */
  private cacheTranslation(
    recipeId: number,
    targetLang: SupportedLanguage,
    recipe: TranslatedRecipe
  ): void {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${recipeId}_${targetLang}`;
      const data = {
        recipe,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  /**
   * Clears all translation caches
   */
  clearTranslationCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}
