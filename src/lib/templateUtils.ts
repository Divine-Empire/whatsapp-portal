/**
 * Client-safe template utilities.
 *
 * This file MUST NOT import anything from whatsapp.ts or any Node.js module
 * (sharp, fs, child_process, etc.).  It is imported by Client Components.
 */

export interface WhatsAppTemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

export interface WhatsAppTemplateMeta {
  name: string;
  category: string;
  /** Plain text header value (if headerType === 'TEXT') */
  header: string;
  /** 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | '' */
  headerType: string;
  /** true when the template requires a dynamic image URL in the header */
  hasImageHeader: boolean;
  body: string;
  footer: string;
  language: string;
  buttons: WhatsAppTemplateButton[];
}

/**
 * Convert a Google Drive share link to a direct-download URL that WhatsApp
 * can fetch as an image.  Returns the original URL unchanged for non-Drive links.
 *
 * Supported input formats:
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   https://drive.google.com/open?id=FILE_ID
 */
export function convertGoogleDriveLinkToDirect(url: string): string {
  if (!url || typeof url !== 'string') return url;

  // Format 1: /file/d/<id>/view  →  /uc?export=download&id=<id>
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  }

  // Format 2: ?id=<id>  →  /uc?export=download&id=<id>
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  }

  return url;
}

/**
 * Build the WhatsApp Cloud API `components` array from the inputs a caller
 * has at send-time.
 *
 * @param imageUrl   - Direct image URL (or Google Drive share link) for IMAGE header templates.
 * @param bodyParams - Values to substitute for {{1}}, {{2}}, … in the body.
 * @param buttons    - Button metadata from the template (fetched from Meta).
 *
 * Rules:
 *  - If imageUrl is non-empty, a "header" component is prepended.
 *    Google Drive links are auto-converted to direct download URLs.
 *  - If bodyParams has values, a "body" component is added.
 *  - QUICK_REPLY buttons with static text need no extra component — Meta
 *    renders them from the template definition automatically.
 *  - URL buttons with a dynamic suffix ({{1}}) get a "button" component entry.
 */
export function buildTemplateComponents({
  imageUrl,
  bodyParams = [],
  buttons = [],
}: {
  imageUrl?: string;
  bodyParams?: string[];
  buttons?: WhatsAppTemplateButton[];
}): any[] {
  const components: any[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  if (imageUrl && imageUrl.trim()) {
    const directUrl = convertGoogleDriveLinkToDirect(imageUrl.trim());
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: { link: directUrl },
        },
      ],
    });
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((val) => ({ type: 'text', text: val })),
    });
  }

  // ── Buttons ───────────────────────────────────────────────────────────────
  // Only URL buttons with a dynamic suffix need an explicit component entry.
  buttons.forEach((btn, index) => {
    if (btn.type === 'URL' && btn.url && btn.url.includes('{{1}}')) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: String(index),
        parameters: [
          {
            type: 'text',
            text: btn.example?.[0] || '',
          },
        ],
      });
    }
  });

  return components;
}
