/**
 * Configuration for the AI Services page (`/RAG`).
 *
 * These mirror the three props the design prototype exposed as editable tweaks.
 * They are plain constants here because nothing on the page needs to vary them
 * at runtime.
 */

/** Feeds every mailto on the page and the CTA button's visible label. */
export const CONTACT_EMAIL = "rahulbabu.moka@gmail.com";

/** Hero and CTA primary buttons — prefilled subject line. */
export const MAILTO_HREF = `mailto:${CONTACT_EMAIL}?subject=AI%20for%20our%20business`;

/** Which service card is expanded on load. 0 = all collapsed. */
export const DEFAULT_OPEN = 1;

/** When true, cards toggle independently instead of behaving as an accordion. */
export const ALLOW_MULTIPLE_OPEN = false;
