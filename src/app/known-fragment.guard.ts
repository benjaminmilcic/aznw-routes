import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Anchors that actually exist on the home page (section IDs).
 * Must match the id attributes of the home sections.
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
 * /#something lands on the home page with the fragment "something".
 * If the fragment points to no existing section, the address is
 * just as invalid as an unknown path -> 404.
 */
export const knownFragmentGuard: CanActivateFn = (route) => {
  const fragment = route.fragment;

  if (!fragment || HOME_FRAGMENTS.includes(fragment)) {
    return true;
  }

  return inject(Router).createUrlTree(['/404']);
};
