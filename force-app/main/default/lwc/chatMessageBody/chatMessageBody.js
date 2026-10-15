import { LightningElement, api } from 'lwc';
import { parseMessage, forEachSegmentList, sanitizeUrl } from 'c/messageParser';

const CACHE_LIMIT = 60;
const MAX_CITATIONS = 5;
const cache = new Map();

function currentOrigin() {
    try {
        return window.location && window.location.origin ? window.location.origin : '';
    } catch (e) {
        return '';
    }
}

function isSameOrigin(href, origin) {
    return (
        !!origin &&
        (href === origin ||
            href.indexOf(origin + '/') === 0 ||
            href.indexOf(origin + '?') === 0 ||
            href.indexOf(origin + '#') === 0)
    );
}

function buildBlocks(text, prefixes) {
    const cacheKey = prefixes.join('|') + '\u0000' + text;
    const hit = cache.get(cacheKey);
    if (hit) {
        return hit;
    }
    const { blocks } = parseMessage(text, { linkPathPrefixes: prefixes });
    const origin = currentOrigin();
    if (origin) {
        // Links to the site itself open in the same tab, everything else in a new one.
        forEachSegmentList(blocks, (list) => {
            list.forEach((seg) => {
                if (seg.isLink && seg.target === '_blank' && isSameOrigin(seg.href, origin)) {
                    seg.target = '_self';
                }
            });
        });
    }
    if (cache.size >= CACHE_LIMIT) {
        cache.delete(cache.keys().next().value);
    }
    cache.set(cacheKey, blocks);
    return blocks;
}

/**
 * Safe renderer for bot / live-agent message text.
 * Input is the RAW message string; parsing and link validation happen here,
 * so callers can never hand it pre-built HTML.
 */
export default class ChatMessageBody extends LightningElement {
    /** Raw message text (Markdown subset). */
    @api text;
    /** Optional [{label, url}] from the Messaging API citationContent. Re-validated here. */
    @api citations;
    /** Optional list of path prefixes (e.g. ['/SupportCases/']) that should be auto-linked when written bare. */
    @api linkPathPrefixes;

    get blocks() {
        const prefixes = Array.isArray(this.linkPathPrefixes)
            ? this.linkPathPrefixes.filter((p) => typeof p === 'string')
            : [];
        return buildBlocks(typeof this.text === 'string' ? this.text : '', prefixes);
    }

    get safeCitations() {
        const list = Array.isArray(this.citations) ? this.citations : [];
        const seen = new Set();
        const out = [];
        for (const c of list) {
            if (out.length >= MAX_CITATIONS) {
                break;
            }
            if (!c || typeof c.url !== 'string') {
                continue;
            }
            const safe = sanitizeUrl(c.url);
            if (!safe || seen.has(safe.href)) {
                continue;
            }
            seen.add(safe.href);
            const label = typeof c.label === 'string' && c.label.trim() ? c.label.trim().slice(0, 120) : safe.href.slice(0, 80);
            out.push({
                key: 'cit' + out.length,
                label,
                href: safe.href,
                target: safe.kind === 'absolute' && !isSameOrigin(safe.href, currentOrigin()) ? '_blank' : '_self'
            });
        }
        return out;
    }

    get hasCitations() {
        return this.safeCitations.length > 0;
    }
}