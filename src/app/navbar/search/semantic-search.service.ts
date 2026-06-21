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
  /** semantischer Cosine-Score (0 wenn Embedding nicht verfügbar). */
  semScore: number;
  /** lexikalischer Score (0..1): Anteil der gefundenen Suchbegriffe / Fuzzy. */
  lexScore: number;
}

/** Häufige Funktionswörter (de/en), die als Suchbegriffe nur Rauschen erzeugen. */
const STOPWORDS = new Set([
  'der', 'die', 'das', 'ein', 'eine', 'einen', 'und', 'oder', 'wie', 'was',
  'wo', 'wann', 'wird', 'ist', 'sind', 'im', 'in', 'an', 'auf', 'zu', 'mit',
  'für', 'von', 'den', 'dem', 'des', 'heute', 'mir', 'mich', 'man',
  'the', 'a', 'an', 'and', 'or', 'how', 'what', 'where', 'when', 'is', 'are',
  'to', 'of', 'for', 'with', 'on', 'me', 'my', 'do', 'does',
]);

/**
 * Hybride Volltextsuche über alle Routen.
 *
 *  - lexikalisch: kommt ein Suchbegriff im (mehrsprachigen) Routen-Text vor?
 *    Längenunabhängig – stark bei exakten Stichwörtern und Eigennamen
 *    ("NestJS", "Wikimedia", "SDXL"). Fuse dient nur noch der Tippfehler-Toleranz.
 *  - semantisch: Query wird per Cloudflare-Worker (bge-m3) embedded und per
 *    Cosine-Ähnlichkeit verglichen – stark bei natürlicher Sprache
 *    ("wie wird das wetter heute?").
 *
 * Eine Route ist Treffer, wenn sie lexikalisch ODER semantisch deutlich passt.
 * Sortiert wird nach der Summe beider Kanäle (exakte Stichwort-Treffer zuerst).
 * Fällt der Worker aus, bleibt die lexikalische Suche als Fallback aktiv.
 */
@Injectable({ providedIn: 'root' })
export class SemanticSearchService {
  private indexPromise?: Promise<IndexedRoute[]>;
  private index: IndexedRoute[] = [];
  private docs: { route: IndexedRoute; hay: string }[] = [];
  private fuse?: Fuse<IndexedRoute>;

  private readonly semThreshold = 0.5; // bge-m3-Cosine für "relevant"
  private readonly lexThreshold = 0.5; // Anteil gefundener Suchbegriffe

  /** Index einmalig laden, cachen und Suchstrukturen aufbauen. */
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
          this.indexPromise = undefined; // erneuter Versuch möglich
          throw err;
        });
    }
    return this.indexPromise;
  }

  /**
   * Rein lexikalische Suche (synchron, sobald der Index geladen ist).
   * Wird für sofortiges Feedback beim Tippen genutzt.
   */
  lexical(query: string, limit = 12): RankedRoute[] {
    if (!this.docs.length) return [];
    return this.rank(query, null, limit);
  }

  /**
   * Hybride Suche. Liefert die relevantesten Routen, absteigend sortiert.
   * @param signal optionaler AbortSignal, um veraltete Anfragen abzubrechen.
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

  /** Lexikalische + (optional) semantische Scores berechnen und ranken. */
  private rank(query: string, qVec: number[] | null, limit: number): RankedRoute[] {
    const terms = this.terms(query);

    // Fuzzy-Treffer (nur für Tippfehler) -> Map nach Route-Key.
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

  /** Suchbegriffe normalisieren: gefaltet, ohne Stopwörter, min. 2 Zeichen. */
  private terms(query: string): string[] {
    return this.fold(query)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  }

  /** Kleinschreibung + Diakritika entfernen ("Milčić" -> "milcic", "über" -> "uber"). */
  private fold(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  /** Anteil der Suchbegriffe, die im Text vorkommen (0..1). */
  private containment(terms: string[], hay: string): number {
    if (!terms.length) return 0;
    let hits = 0;
    for (const t of terms) if (hay.includes(t)) hits++;
    return hits / terms.length;
  }

  private key(r: IndexedRoute): string {
    return r.route + (r.fragment ?? '');
  }

  /** Query-Embedding vom Worker holen. */
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

  /** Skalarprodukt = Cosine, da beide Vektoren normalisiert sind. */
  private dot(a: number[], b: number[]): number {
    let s = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) s += a[i] * b[i];
    return s;
  }
}
