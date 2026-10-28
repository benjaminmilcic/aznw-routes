// Shape of portfolio.json. The file is also read by the AI chat's knowledge index,
// so texts stay in the i18n files and are only referenced here by key.
// "{lang}" in image paths and links is replaced with the current language.

export interface PortfolioProject {
  id: string;
  /** Either a fixed title or a translation key */
  title?: string;
  titleKey?: string;
  descKey: string;
  image: string;
  imageAlt: string;
  stack: string[];
  pin: { position: 'left' | 'center' | 'right'; color: string };
  /** Hidden projects are neither shown on the website nor mentioned in the chat */
  hidden?: boolean;
  /** Internal route opened by the card instead of a dialog */
  route?: string;
  dialog?: PortfolioBlock[];
  /** Wraps the whole dialog content in a project section (extra space at the bottom) */
  dialogInSection?: boolean;
}

export type PortfolioBlock =
  | { type: 'website'; href: string }
  | { type: 'text'; parts: PortfolioTextPart[] }
  | {
      type: 'section';
      titleKey: string;
      image: { src: string; alt: string; kind: 'web-app' | 'mobile-app' };
      /** Extra space around the links, as below the web app screenshots */
      spacedLinks?: boolean;
      links: PortfolioLink[];
    }
  | {
      type: 'gallery';
      layout: 'catchcups' | 'grid' | 'vertical';
      images: { src: string; alt: string }[];
    }
  | { type: 'storeBadge'; href: string; alt: string; variant: 'small' | 'badge' };

/** A translated text or an (optionally linked) fixed text; parts are separated by a space unless glue is set */
export interface PortfolioTextPart {
  key?: string;
  text?: string;
  href?: string;
  glue?: boolean;
}

export interface PortfolioLink {
  href: string;
  icon: string;
  label?: string;
  labelKey?: string;
  style: 'primary' | 'secondary';
  newTab: boolean;
}
