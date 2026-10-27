// =============================================================
//  Switchable Firebase log for debugging.
// =============================================================
// On someone else's device (e.g. the phone of a fellow player) the
// browser console is not that easy to look at. So that you can still follow
// the connection behavior of the Realtime Database:
//
//   ...?fbdebug=1   turn the log on (survives a reload)
//   ...?fbdebug=0   turn the log off again
//
// The log ends up in the browser console. On a phone it can be read via USB
// from a computer: open Chrome → chrome://inspect.
// =============================================================
import { enableLogging } from 'firebase/database';

const FLAG_KEY = 'rtdb_debug';

/** Reads the switch from URL/localStorage and enables the log if needed. */
export function enableRtdbDebugFromUrl(): void {
  try {
    const param = new URLSearchParams(location.search).get('fbdebug');
    if (param === '0' || param === 'false') {
      localStorage.removeItem(FLAG_KEY);
      return;
    }
    if (param !== null) localStorage.setItem(FLAG_KEY, '1');
    if (localStorage.getItem(FLAG_KEY) === '1') {
      enableLogging(true);
      console.info('[sync] Firebase-Protokoll aktiv (mit ?fbdebug=0 abschalten).');
    }
  } catch {
    /* no localStorage (private mode) – then simply no log */
  }
}
