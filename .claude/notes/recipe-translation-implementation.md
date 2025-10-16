# Rezept-Übersetzung - Implementierung

## Übersicht
Die Rezept-Übersetzungsfunktion ermöglicht es, Rezepte automatisch in Deutsch, Englisch oder Kroatisch zu übersetzen.

## Verwendete Technologien

### 1. Spracherkennung: `franc-min`
- **Paket**: `franc-min` v6.2.0
- **Installation**: `npm install franc-min --legacy-peer-deps`
- **Funktion**: Erkennt automatisch die Sprache des Rezept-Textes (aus `recipe.preparation`)
- **Unterstützte Sprachen**: Deutsch (deu), Englisch (eng), Kroatisch (hrv)
- **Client-seitig**: Keine API-Calls, funktioniert offline

### 2. Übersetzung: MyMemory API
- **API Endpoint**: `https://api.mymemory.translated.net/get`
- **Kosten**: Komplett kostenlos bis 10.000 Wörter/Tag
- **API Key**: NICHT erforderlich
- **Dokumentation**: https://mymemory.translated.net/doc/spec.php

#### API Request Format:
```typescript
GET https://api.mymemory.translated.net/get?q=Hello&langpair=en|de
```

#### API Response:
```typescript
{
  "responseData": {
    "translatedText": "Hallo"
  },
  "responseStatus": 200
}
```

**Hinweis**: LibreTranslate wurde ursprünglich geplant, aber die Free Public API erfordert jetzt einen API-Key. MyMemory funktioniert ohne Registrierung.

## Implementierte Features

### Service-Methoden (recipes.service.ts)

#### 1. `detectLanguage(text: string): SupportedLanguage | 'unknown'`
- Erkennt die Sprache eines Textes
- Verwendet `franc-min` für die Analyse
- Mapped ISO 639-3 (franc) zu ISO 639-1 (LibreTranslate)

#### 2. `translateRecipe(recipe: Recipe, targetLang: SupportedLanguage): Observable<TranslatedRecipe>`
- Übersetzt ein komplettes Rezept (title, ingredients[], preparation)
- Prüft zuerst den Cache
- Erkennt Ausgangssprache automatisch
- Übersetzt alle Felder parallel mit `forkJoin`
- Speichert Ergebnis im Cache (LocalStorage)

#### 3. `getCachedTranslation(recipeId: number, targetLang: SupportedLanguage): TranslatedRecipe | null`
- Holt übersetztes Rezept aus LocalStorage-Cache
- Cache läuft nach 30 Tagen ab

#### 4. `cacheTranslation(recipeId: number, targetLang: SupportedLanguage, recipe: TranslatedRecipe): void`
- Speichert Übersetzung im LocalStorage
- Cache-Key: `recipe_translation_{id}_{lang}`

#### 5. `clearTranslationCache(): void`
- Löscht alle gespeicherten Übersetzungen

### Komponenten-Features (recipe-item.component.ts)

#### State Management:
- `isTranslating`: Loading-State während Übersetzung
- `detectedLanguage`: Automatisch erkannte Sprache
- `currentLanguage`: Aktuell angezeigte Sprache
- `originalRecipe$`: BehaviorSubject mit Original-Rezept
- `translatedRecipe$`: BehaviorSubject mit übersetztem Rezept

#### UI-Methoden:
- `translateTo(language: SupportedLanguage)`: Übersetzt in gewählte Sprache
- `showOriginal()`: Zeigt Original-Rezept an
- `getLanguageLabel(lang)`: Gibt Sprach-Namen zurück (Deutsch, English, Hrvatski)
- `getLanguageFlag(lang)`: Gibt Flaggen-Emoji zurück (🇩🇪, 🇬🇧, 🇭🇷)

### UI-Komponenten (recipe-item.component.html)

#### Übersetzungs-Menu:
- Dropdown-Menu mit Material Design (`mat-menu`)
- 3 Sprach-Optionen: Deutsch, English, Hrvatski
- "Original anzeigen" Option (nur wenn Übersetzung aktiv)
- Loading-Spinner während Übersetzung
- Button wird während Übersetzung deaktiviert

#### Sprach-Info:
- Zeigt erkannte Originalsprache
- Zeigt aktuell angezeigte Sprache (wenn übersetzt)

## Verwendung

### Im Code:
```typescript
// Sprache erkennen
const lang = this.recipeService.detectLanguage(recipe.preparation);

// Rezept übersetzen
this.recipeService.translateRecipe(recipe, 'de').subscribe(translated => {
  console.log(translated.title); // Übersetzter Titel
});

// Cache leeren
this.recipeService.clearTranslationCache();
```

### In der UI:
1. Öffne ein Rezept
2. Klicke auf "🌐 Übersetzen" Button
3. Wähle Zielsprache (🇩🇪 Deutsch / 🇬🇧 English / 🇭🇷 Hrvatski)
4. Warte auf Übersetzung (Spinner)
5. Optional: Klicke "🔄 Original anzeigen" um zurückzukehren

## Performance-Optimierungen

### 1. Caching
- Übersetzungen werden 30 Tage im LocalStorage gespeichert
- Bei erneutem Abruf keine API-Calls nötig
- Cache-Key enthält Rezept-ID und Zielsprache

### 2. Parallele Übersetzung
- Titel, Zutaten und Zubereitung werden parallel übersetzt
- Verwendet RxJS `forkJoin` für optimale Performance
- Alle Zutaten werden parallel übersetzt (nicht sequentiell)

### 3. Error Handling
- Bei API-Fehler wird Original-Text zurückgegeben
- Fallback bei Sprach-Erkennung: "unknown"
- Keine Übersetzung wenn Quell- = Zielsprache

## Bekannte Einschränkungen

### MyMemory Free API:
- **Limit**: 10.000 Wörter pro Tag (ohne API-Key)
- **Rate Limit**: Maximal 1000 Zeichen pro Request
- **Qualität**: Gut für allgemeine Texte, kann bei Fachbegriffen variieren
- **Verfügbarkeit**: Sehr stabil, öffentlicher Dienst

### Wenn Limits erreicht werden:
Falls du mehr als 10.000 Wörter/Tag brauchst:

**Option 1: MyMemory API-Key** (kostenlos mit höheren Limits)
- Registriere dich auf https://mymemory.translated.net
- Hol dir einen kostenlosen API-Key
- Füge `&key=YOUR_KEY` an die URL an

**Option 2: Alternative APIs**
- DeepL Free (500k Zeichen/Monat, kein Kroatisch)
- Google Cloud Translation (erste 500k Zeichen/Monat kostenlos)
- LibreTranslate Self-Hosting (Docker)

### Weitere mögliche Features:
- [ ] Batch-Übersetzung mehrerer Rezepte
- [ ] Übersetzung in der Rezept-Liste (nicht nur Detail-Ansicht)
- [ ] User-Präferenz speichern (bevorzugte Sprache)
- [ ] Offline-Modus mit Web Translation API (Chrome 131+)
- [ ] Übersetzungs-Qualität bewerten lassen
- [ ] Alternative API-Provider als Fallback

## Testing

### Manuelle Tests:
1. Erstelle Rezepte in verschiedenen Sprachen
2. Teste Übersetzung DE → EN → HR
3. Prüfe Cache (Network Tab in DevTools)
4. Teste Offline-Verhalten (Network throttling)
5. Prüfe LocalStorage (Application Tab in DevTools)

### Zu testende Edge Cases:
- Sehr kurze Rezepte (< 10 Zeichen)
- Rezepte mit Sonderzeichen
- Rezepte mit gemischten Sprachen
- API-Fehler simulieren (Netzwerk aus)
- Cache-Ablauf (Timestamp manipulieren)

## Dateien geändert

- ✅ `src/app/pages/gimmicks/recipes/recipes.service.ts`
- ✅ `src/app/pages/gimmicks/recipes/recipe-item/recipe-item.component.ts`
- ✅ `src/app/pages/gimmicks/recipes/recipe-item/recipe-item.component.html`
- ✅ `package.json` (franc-min hinzugefügt)

## Zusammenfassung

Die Implementierung ist vollständig funktional und bietet:
- ✅ Automatische Spracherkennung
- ✅ Übersetzung in DE/EN/HR
- ✅ Caching für Performance
- ✅ Fehlerbehandlung
- ✅ Benutzerfreundliche UI
- ✅ Kostenlose Public API

Die Lösung ist produktionsreif, sollte aber bei hohem Traffic-Aufkommen durch Self-Hosting oder API-Key ergänzt werden.
