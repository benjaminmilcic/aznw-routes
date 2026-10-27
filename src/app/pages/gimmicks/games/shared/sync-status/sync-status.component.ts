import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { AwayPlayer } from '../firebase/game-channel';

/**
 * Shows when the connection to the game is down or a move could not
 * be saved.
 *
 * Before, nothing like this was visible anywhere: the games' error message was
 * rendered only on the start screen. Whoever was already in the game
 * noticed nothing of a lost connection – the board simply stayed
 * put and both players waited for each other.
 *
 * `error` is – as everywhere in the games here – a translation key.
 */
@Component({
  selector: 'app-sync-status',
  imports: [TranslateModule],
  templateUrl: './sync-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncStatusComponent {
  /** The connection has been gone for a while (short dropouts are not reported). */
  readonly offline = input(false);
  /** Translation key of the message, or null. */
  readonly error = input<string | null>(null);
  /** A move is on its way and is taking noticeably long. */
  readonly pending = input(false);
  /** Players who are currently not connected. */
  readonly away = input<AwayPlayer[]>([]);
  /**
   * The absent player the round is waiting for – only set after the grace
   * period. Only then do we offer to skip.
   */
  readonly blocking = input<AwayPlayer | null>(null);

  /** Names of the absent players, ready for the message. */
  protected readonly awayNames = computed(() =>
    this.away()
      .map((p) => p.name)
      .filter(Boolean)
      .join(', '),
  );

  /** Dismiss the notice. */
  readonly dismissed = output<void>();
  /** Fetch the state from the server again. */
  readonly retried = output<void>();
  /** Remove the absent player from the round. */
  readonly skipped = output<string>();
}
