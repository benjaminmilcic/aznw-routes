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
 *   same tab. All other links open in a new tab.
 * - Images from other hosts are removed.
 */
@Pipe({ name: 'chatMarkdown' })
export class ChatMarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    const html = DOMPurify.sanitize(marked.parse(value, { async: false, breaks: true }));
    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll('a[href]').forEach((link) => {
      const path = internalPath(link.getAttribute('href')!);
      if (path) {
        link.setAttribute('data-internal', path);
        link.setAttribute('href', path);
        link.removeAttribute('target');
      } else {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
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

/** The path of a link to the website (relative or absolute), or null for external links. */
function internalPath(href: string): string | null {
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  try {
    const url = new URL(href);
    if (SITE_HOSTS.includes(url.hostname)) return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // not an absolute URL (mailto: etc. are handled as external)
  }
  return null;
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
