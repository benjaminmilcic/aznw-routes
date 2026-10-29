import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

/** Images in answers only from Benjamin's own servers – a guestbook entry could otherwise smuggle in any URL. */
const IMAGE_HOSTS = ['api.benjamin-milcic.dev', 'benjamin-milcic.dev', 'www.benjamin-milcic.dev'];
const SITE_HOSTS = ['benjamin-milcic.dev', 'www.benjamin-milcic.dev'];

/**
 * Renders the Markdown of an answer as safe HTML.
 * - Links to the website get `data-internal` with their path – the chat opens them with the Angular router in the
 *   same tab. All other links open in a new tab, as do files of the website (the CV as PDF).
 * - Links to the chat itself become plain text – the visitor is already here. So do links without a target: the
 *   backend empties the target of an invented path that fits no page of the website.
 * - Links to GitHub show their full address, so visitors see which repository and folder they lead to.
 * - Images from other hosts are removed.
 */
@Pipe({ name: 'chatMarkdown' })
export class ChatMarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    const html = DOMPurify.sanitize(marked.parse(value, { async: false, breaks: true }));
    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href')?.trim();
      if (!href) {
        link.replaceWith(...Array.from(link.childNodes));
        return;
      }
      const path = internalPath(href);
      if (path && /^\/chat\/?(?:[?#]|$)/.test(path)) {
        link.replaceWith(...Array.from(link.childNodes));
      } else if (path) {
        link.setAttribute('data-internal', path);
        link.setAttribute('href', path);
        link.removeAttribute('target');
      } else {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        if (isGitHub(href) && !link.querySelector('img')) link.textContent = href;
      }
    });
    template.content.querySelectorAll('img').forEach((image) => {
      if (!isAllowedImage(image.getAttribute('src') ?? '')) {
        image.remove();
        return;
      }
      image.setAttribute('loading', 'lazy');
    });

    // Sanitized by DOMPurify above; Angular's own sanitizer would remove the data-internal attributes
    return this.sanitizer.bypassSecurityTrustHtml(template.innerHTML);
  }
}

/** The path of a link to a page of the website (relative or absolute), or null for external links and files. */
function internalPath(href: string): string | null {
  let path: string | null = null;
  if (href.startsWith('/') && !href.startsWith('//')) {
    path = href;
  } else {
    try {
      const url = new URL(href);
      if (SITE_HOSTS.includes(url.hostname)) path = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      // not an absolute URL (mailto: etc. are handled as external)
    }
  }
  // Files like the CV are no routes – the router would show the 404 page
  return path && !path.startsWith('/assets/') ? path : null;
}

function isGitHub(href: string): boolean {
  try {
    return new URL(href).hostname === 'github.com';
  } catch {
    return false;
  }
}

function isAllowedImage(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && IMAGE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
