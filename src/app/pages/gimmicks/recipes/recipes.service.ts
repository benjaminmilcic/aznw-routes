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

  // Mapping von franc ISO 639-3 zu ISO 639-1 (MyMemory API)
  // Hinweis: Südslawische Sprachen sind sehr ähnlich und werden oft verwechselt
  private readonly langMap: { [key: string]: SupportedLanguage } = {
    deu: 'de',
    eng: 'en',
    hrv: 'hr',
    srp: 'hr', // Serbisch -> als Kroatisch behandeln (ähnliche Sprachen)
    bos: 'hr', // Bosnisch -> als Kroatisch behandeln
    hbs: 'hr', // Serbokroatisch -> als Kroatisch behandeln
    slv: 'hr', // Slowenisch -> als Kroatisch behandeln (südslawische Sprache)
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
   * Erkennt die Sprache eines Textes
   * @param text Der zu analysierende Text
   * @returns Sprach-Code (de, en, hr) oder 'unknown'
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

      const detectedLang = detected[0][0]; // ISO 639-3 Code (z.B. 'deu')
      const mappedLang = this.langMap[detectedLang];

      return mappedLang || 'unknown';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'unknown';
    }
  }

  /**
   * Übersetzt ein Rezept in die Zielsprache
   * @param recipe Das zu übersetzende Rezept
   * @param targetLang Zielsprache (de, en, hr)
   * @returns Observable mit übersetztem Rezept
   */
  translateRecipe(
    recipe: Recipe,
    targetLang: SupportedLanguage
  ): Observable<TranslatedRecipe> {
    // Prüfe Cache
    const cached = this.getCachedTranslation(recipe.id, targetLang);
    if (cached) {
      return of(cached);
    }

    // Erkenne Ausgangssprache
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
      // Keine Übersetzung nötig
      return of({
        ...recipe,
        detectedLanguage: sourceLang,
        targetLanguage: targetLang,
      });
    }

    // Übersetze alle Felder parallel
    const title$ = this.translateText(recipe.title, sourceLang, targetLang);
    const preparation$ = this.translateText(
      recipe.preparation,
      sourceLang,
      targetLang
    );

    // Übersetze alle Zutaten
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

        // Speichere in Cache
        this.cacheTranslation(recipe.id, targetLang, translatedRecipe);

        return translatedRecipe;
      })
      // ❌ Entfernt: catchError wird entfernt damit Fehler zur Component durchgereicht werden
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
   * Übersetzt einen einzelnen Text mit MyMemory API
   * @param text Zu übersetzender Text
   * @param sourceLang Ausgangssprache
   * @param targetLang Zielsprache
   * @returns Observable mit übersetztem Text
   */
  private translateText(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Observable<string> {
    if (!text || text.trim().length === 0) {
      return of(text);
    }

    const MAX_CHARS = 450; // Sicherheitspuffer unter dem 500-Zeichen-Limit

    // Wenn Text kurz genug ist, direkt übersetzen
    if (text.length <= MAX_CHARS) {
      return this.translateTextChunk(text, sourceLang, targetLang);
    }

    // Text in Chunks aufteilen
    const chunks = this.splitTextIntoChunks(text, MAX_CHARS);

    // Alle Chunks parallel übersetzen
    const translations$ = chunks.map((chunk) =>
      this.translateTextChunk(chunk.text, sourceLang, targetLang)
    );

    // Alle Übersetzungen zusammenfügen mit Original-Separatoren
    return forkJoin(translations$).pipe(
      map((translatedChunks) => {
        let result = '';
        translatedChunks.forEach((translated, idx) => {
          result += translated;
          if (idx < chunks.length - 1) {
            // Verwende den Original-Separator (kann \n oder Leerzeichen sein)
            result += chunks[idx].separator || ' ';
          }
        });
        return result;
      })
    );
  }

  /**
   * Teilt einen Text in Chunks auf, die an Satzgrenzen getrennt werden
   * @param text Der zu teilende Text
   * @param maxLength Maximale Länge pro Chunk
   * @returns Array von Objekten mit Text-Chunks und nachfolgendem Separator
   */
  private splitTextIntoChunks(
    text: string,
    maxLength: number
  ): Array<{ text: string; separator: string }> {
    const chunks: Array<{ text: string; separator: string }> = [];
    let currentChunk = '';
    let chunkSeparator = '';

    // Splitte Text an allen Whitespace-Grenzen und behalte die Separatoren
    const parts = text.split(/(\s+)/);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Überspringe leere Parts
      if (!part) continue;

      // Ist es ein Separator (Leerzeichen/Zeilenumbrüche)?
      if (/^\s+$/.test(part)) {
        // Füge Separator zum aktuellen Chunk hinzu
        chunkSeparator += part;
        continue;
      }

      // Es ist ein Textteil (Wort oder Phrase)
      const word = part;

      // Prüfe ob das Wort in den aktuellen Chunk passt
      const wouldBeLength =
        currentChunk.length + chunkSeparator.length + word.length;

      if (wouldBeLength <= maxLength || !currentChunk) {
        // Füge zum aktuellen Chunk hinzu
        currentChunk += chunkSeparator + word;
        chunkSeparator = '';
      } else {
        // Chunk ist voll - speichere ihn mit dem gesammelten Separator
        chunks.push({
          text: currentChunk,
          separator: chunkSeparator,
        });

        // Starte neuen Chunk mit dem aktuellen Wort
        currentChunk = word;
        chunkSeparator = '';
      }
    }

    // Letzten Chunk hinzufügen
    if (currentChunk) {
      chunks.push({
        text: currentChunk,
        separator: chunkSeparator,
      });
    }

    return chunks;
  }

  /**
   * Übersetzt einen einzelnen Text-Chunk mit MyMemory API
   * @param text Zu übersetzender Text-Chunk
   * @param sourceLang Ausgangssprache
   * @param targetLang Zielsprache
   * @returns Observable mit übersetztem Text
   */
  private translateTextChunk(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Observable<string> {
    // MyMemory API verwendet GET mit Query-Parametern
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
          // Rate Limit erreicht
          throw new Error('TRANSLATION_RATE_LIMIT_EXCEEDED');
        } else if (response.responseStatus === 429) {
          // Zu viele Anfragen
          throw new Error('TRANSLATION_TOO_MANY_REQUESTS');
        } else {
          console.warn('Translation API warning:', response.responseDetails);
          throw new Error('TRANSLATION_API_ERROR');
        }
      }),
      catchError((error) => {
        console.error('Translation API error:', error);

        // Spezifische Fehler weiterleiten
        if (error.message?.startsWith('TRANSLATION_')) {
          throw error;
        }

        // Netzwerkfehler
        if (error.status === 0) {
          throw new Error('TRANSLATION_NETWORK_ERROR');
        }

        // Sonstige Fehler
        throw new Error('TRANSLATION_UNKNOWN_ERROR');
      })
    );
  }

  /**
   * Holt übersetztes Rezept aus dem Cache
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
   * Speichert übersetztes Rezept im Cache
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
   * Löscht alle Translation-Caches
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
