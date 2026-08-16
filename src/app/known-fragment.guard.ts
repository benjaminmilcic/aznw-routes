import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Anker, die es auf der Startseite tatsaechlich gibt (Sektions-IDs).
 * Muss mit den id-Attributen der Home-Sektionen uebereinstimmen.
 */
export const HOME_FRAGMENTS = [
  'header',
  'about',
  'skills',
  'portfolio',
  'contact',
  'footer',
];

/**
 * Beim Hash-Routing wird ein zweites "#" als Fragment gelesen:
 * /#/#irgendwas landet auf der Startseite mit dem Fragment "irgendwas".
 * Zeigt das Fragment auf keine existierende Sektion, ist die Adresse
 * genauso ungueltig wie ein unbekannter Pfad -> 404.
 */
export const knownFragmentGuard: CanActivateFn = (route) => {
  const fragment = route.fragment;

  if (!fragment || HOME_FRAGMENTS.includes(fragment)) {
    return true;
  }

  return inject(Router).createUrlTree(['/404']);
};
