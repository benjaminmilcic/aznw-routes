import { Injectable } from '@angular/core';
import Fuse from 'fuse.js';
import { environment } from '../../../environments/environment';

export interface IndexedRoute {
  route: string;
  fragment?: string;
  labelKey?: string;
  label?: string;
  icon: string;
  category: string;
  text: string;
  vector: number[];
}

export interface RankedRoute extends IndexedRoute {
  score: number;
  /** semantic cosine score (0 if the embedding is not available). */
  semScore: number;
  /** lexical score (0..1): share of the search terms found / fuzzy. */
  lexScore: number;
}

/** Common function words (de/en) that only add noise as search terms. */
const STOPWORDS = new Set([
  'der', 'die', 'das', 'ein', 'eine', 'einen', 'und', 'oder', 'wie', 'was',
  'wo', 'wann', 'wird', 'ist', 'sind', 'im', 'in', 'an', 'auf', 'zu', 'mit',
  'für', 'von', 'den', 'dem', 'des', 'heute', 'mir', 'mich', 'man',
  'the', 'a', 'an', 'and', 'or', 'how', 'what', 'where', 'when', 'is', 'are',
  'to', 'of', 'for', 'with', 'on', 'me', 'my', 'do', 'does',
]);

/**
 * Hybrid full-text search across all routes.
 *
 *  - lexical: does a search term occur in the (multilingual) route text?
 *    Independent of length – strong for exact keywords and proper names
 *    ("NestJS", "Wikimedia", "SDXL"). Fuse is only used for typo tolerance.
 *  - semantic: the query is embedded via the Cloudflare Worker (bge-m3) and
 *    compared by cosine similarity – strong for natural language
 *    ("wie wird das wetter heute?").
 *
 * A route is a match if it fits clearly lexically OR semantically.
 * It is sorted by the sum of both channels (exact keyword matches first).
 * If the worker fails, the lexical search stays active as a fallback.
 */
@Injectable({ providedIn: 'root' })
export class SemanticSearchService {
  private indexPromise?: Promise<IndexedRoute[]>;
  private index: IndexedRoute[] = [];
  private docs: { route: IndexedRoute; hay: string }[] = [];
  private fuse?: Fuse<IndexedRoute>;

  private readonly semThreshold = 0.5; // bge-m3 cosine for "relevant"
  private readonly lexThreshold = 0.5; // Share of search terms found

  /** Load the index once, cache it and build the search structures. */
  loadIndex(): Promise<IndexedRoute[]> {
    if (!this.indexPromise) {
      this.indexPromise = fetch('assets/search-index.json')
        .then((r) => {
          if (!r.ok) throw new Error(`index load failed (${r.status})`);
          return r.json();
        })
        .then((data) => {
          this.index = (data.routes as IndexedRoute[]) ?? [];
          this.docs = this.index.map((r) => ({
            route: r,
            hay: this.fold(`${r.label ? r.label + ' ' : ''}${r.text}`),
          }));
          this.fuse = new Fuse(this.index, {
            keys: [
              { name: 'label', weight: 3 },
              { name: 'text', weight: 1 },
            ],
            threshold: 0.3,
            includeScore: true,
            minMatchCharLength: 3,
            ignoreLocation: true,
          });
          return this.index;
        })
        .catch((err) => {
          this.indexPromise = undefined; // another attempt possible
          throw err;
        });
    }
    return this.indexPromise;
  }

  /**
   * Purely lexical search (synchronous as soon as the index is loaded).
   * Used for instant feedback while typing.
   */
  lexical(query: string, limit = 12): RankedRoute[] {
    if (!this.docs.length) return [];
    return this.rank(query, null, limit);
  }

  /**
   * Hybrid search. Returns the most relevant routes, sorted in descending order.
   * @param signal optional AbortSignal to cancel outdated requests.
   */
  async search(
    query: string,
    options: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<RankedRoute[]> {
    const { limit = 12, signal } = options;
    const q = query.trim();
    if (!q) return [];

    await this.loadIndex();

    let qVec: number[] | null = null;
    try {
      qVec = this.normalize(await this.embed(q, signal));
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      console.warn('Embedding nicht verfügbar, nur lexikalische Suche:', err);
    }

    return this.rank(q, qVec, limit);
  }

  /** Compute and rank lexical + (optional) semantic scores. */
  private rank(query: string, qVec: number[] | null, limit: number): RankedRoute[] {
    const terms = this.terms(query);

    // Fuzzy matches (only for typos) -> map by route key.
    const fuzzMap = new Map<string, number>();
    if (this.fuse) {
      for (const res of this.fuse.search(query)) {
        fuzzMap.set(this.key(res.item), 1 - (res.score ?? 1));
      }
    }

    return this.docs
      .map(({ route, hay }) => {
        const contain = this.containment(terms, hay);
        const fuzz = fuzzMap.get(this.key(route)) ?? 0;
        const lexScore = Math.max(contain, fuzz);
        const semScore = qVec ? this.dot(qVec, route.vector) : 0;
        return { ...route, lexScore, semScore, score: lexScore + semScore };
      })
      .filter((r) => r.lexScore >= this.lexThreshold || r.semScore >= this.semThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Normalize search terms: folded, without stop words, at least 2 characters. */
  private terms(query: string): string[] {
    return this.fold(query)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  }

  /**
   * Lowercase + remove diacritics ("Milčić" -> "milcic").
   * German umlauts are expanded to the ae/oe/ue/ss spelling so that
   * "täglich" and "taeglich" fold identically ("taeglich") and both are
   * found. The expansion happens before stripping, otherwise ä would become a.
   */
  private fold(s: string): string {
    return s
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  /** Share of the search terms that occur in the text (0..1). */
  private containment(terms: string[], hay: string): number {
    if (!terms.length) return 0;
    let hits = 0;
    for (const t of terms) if (hay.includes(t)) hits++;
    return hits / terms.length;
  }

  private key(r: IndexedRoute): string {
    return r.route + (r.fragment ?? '');
  }

  /** Fetch the query embedding from the worker. */
  private async embed(q: string, signal?: AbortSignal): Promise<number[]> {
    const res = await fetch(environment.search.embedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q }),
      signal,
    });
    if (!res.ok) throw new Error(`embed failed (${res.status})`);
    const json = await res.json();
    if (!Array.isArray(json.vector)) throw new Error('embed: missing vector');
    return json.vector as number[];
  }

  private normalize(v: number[]): number[] {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  }

  /** Dot product = cosine, since both vectors are normalized. */
  private dot(a: number[], b: number[]): number {
    let s = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) s += a[i] * b[i];
    return s;
  }
}
