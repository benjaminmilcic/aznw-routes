import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { AwayPlayer } from '../firebase/game-channel';

/**
 * Zeigt an, wenn die Verbindung zum Spiel nicht steht oder ein Zug nicht
 * gespeichert werden konnte.
 *
 * Vorher war so etwas nirgends sichtbar: die Fehlermeldung der Spiele wurde
 * ausschliesslich auf dem Startbildschirm gerendert. Wer schon im Spiel war,
 * bekam von einem Verbindungsverlust nichts mit – das Brett blieb einfach
 * stehen und beide Spieler warteten aufeinander.
 *
 * `error` ist – wie ueberall in den Spielen hier – ein Uebersetzungsschluessel.
 */
@Component({
  selector: 'app-sync-status',
  imports: [TranslateModule],
  templateUrl: './sync-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncStatusComponent {
  /** Verbindung ist laenger weg (kurze Aussetzer werden nicht gemeldet). */
  readonly offline = input(false);
  /** Uebersetzungsschluessel der Meldung, oder null. */
  readonly error = input<string | null>(null);
  /** Ein Zug ist unterwegs und dauert auffaellig lange. */
  readonly pending = input(false);
  /** Mitspieler, die gerade nicht verbunden sind. */
  readonly away = input<AwayPlayer[]>([]);
  /**
   * Der abwesende Spieler, auf den die Runde wartet – erst nach der Karenzzeit
   * gesetzt. Nur dann bieten wir das Ueberspringen an.
   */
  readonly blocking = input<AwayPlayer | null>(null);

  /** Namen der Abwesenden, fertig fuer die Meldung. */
  protected readonly awayNames = computed(() =>
    this.away()
      .map((p) => p.name)
      .filter(Boolean)
      .join(', '),
  );

  /** Hinweis wegklicken. */
  readonly dismissed = output<void>();
  /** Stand neu vom Server holen. */
  readonly retried = output<void>();
  /** Abwesenden Spieler aus der Runde nehmen. */
  readonly skipped = output<string>();
}
