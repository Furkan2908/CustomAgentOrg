/**
 * c/messageParser
 *
 * Pure, DOM-free parser for chat message text (Markdown subset + a few raw-HTML
 * conveniences). It returns PLAIN DATA ONLY (blocks -> segments). It never
 * produces an HTML string, so nothing it returns can execute: the renderer
 * (c/chatMessageBody) writes every value through LWC text nodes / attributes.
 *
 * Design rules
 *  - Linear scanners (no chained/backtracking regexes, no lookbehind).
 *  - Hard limits; anything beyond a limit degrades to a single plain-text block.
 *  - Links are allow-listed by scheme (see sanitizeUrl). Everything else is text.
 */

export const LIMITS = Object.freeze({
    MAX_CHARS: 50000,
    MAX_LINES: 2000,
    MAX_BLOCKS: 200,
    MAX_SEGMENTS: 5000,
    MAX_LIST_ITEMS: 300,
    MAX_TABLE_ROWS: 50,
    MAX_TABLE_COLS: 20,
    MAX_URL_LENGTH: 2048,
    MAX_SCAN_BUDGET: 300000
});

const ESCAPABLE = '\\`*_[]()#+-.!|<>~';
const URL_TAIL_PUNCT = '.,;:!?\'"*_~';

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

// ASCII-only lower-casing. Unlike toLowerCase() it never changes string
// length, so indexes computed on the lowered copy stay valid on the original.
function asciiLower(s) {
    return s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

function isDigit(ch) {
    return ch !== undefined && ch !== '' && ch >= '0' && ch <= '9';
}

function isAlnum(ch) {
    if (!ch) {
        return false;
    }
    const c = ch.charCodeAt(0);
    return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c > 127;
}

function isBlank(ch) {
    return ch === '' || ch === ' ' || ch === '\t' || ch === '\n';
}

function countChar(str, ch, end) {
    let n = 0;
    for (let i = 0; i < end; i++) {
        if (str.charAt(i) === ch) {
            n++;
        }
    }
    return n;
}

function trimUrlTail(url) {
    let end = url.length;
    while (end > 0) {
        const c = url.charAt(end - 1);
        if (URL_TAIL_PUNCT.indexOf(c) !== -1) {
            end--;
        } else if (c === ')' && countChar(url, '(', end) < countChar(url, ')', end)) {
            end--;
        } else if (c === ']' && countChar(url, '[', end) < countChar(url, ']', end)) {
            end--;
        } else {
            break;
        }
    }
    return url.slice(0, end);
}

/* ------------------------------------------------------------------ */
/* URL policy                                                          */
/* ------------------------------------------------------------------ */

/**
 * Returns { href, kind } for URLs we are willing to link, otherwise null.
 * kind: 'absolute' (http/https) | 'relative' (/path) | 'mailto' | 'tel'
 *
 * Allow-list only. Rejects: javascript:, data:, vbscript:, file:, blob:,
 * protocol-relative (//host), backslashes, control/format characters,
 * whitespace inside the URL, and bare relative strings ("foo/bar").
 */
export function sanitizeUrl(raw) {
    if (typeof raw !== 'string') {
        return null;
    }
    let url = raw.trim();
    if (!url || url.length > LIMITS.MAX_URL_LENGTH) {
        return null;
    }
    for (let i = 0; i < url.length; i++) {
        const c = url.charCodeAt(i);
        if (
            c <= 0x20 ||
            c === 0x5c ||
            (c >= 0x7f && c <= 0x9f) ||
            (c >= 0x200b && c <= 0x200f) ||
            (c >= 0x2028 && c <= 0x202e) ||
            c === 0xfeff
        ) {
            return null;
        }
    }
    if (asciiLower(url.slice(0, 4)) === 'www.') {
        url = 'https://' + url;
    }
    if (url.charAt(0) === '/') {
        if (url.charAt(1) === '/') {
            return null;
        }
        return { href: url, kind: 'relative' };
    }
    let idx = -1;
    for (let i = 0; i < url.length; i++) {
        const ch = url.charAt(i);
        if (ch === ':') {
            idx = i;
            break;
        }
        if (ch === '/' || ch === '?' || ch === '#') {
            break;
        }
    }
    if (idx < 1) {
        return null;
    }
    const scheme = asciiLower(url.slice(0, idx));
    const rest = url.slice(idx + 1);
    if (scheme === 'http' || scheme === 'https') {
        if (rest.length < 3 || rest.slice(0, 2) !== '//') {
            return null;
        }
        const first = rest.charAt(2);
        if (first === '/' || first === '?' || first === '#') {
            return null;
        }
        return { href: url, kind: 'absolute' };
    }
    if (scheme === 'mailto' || scheme === 'tel') {
        return rest ? { href: url, kind: scheme } : null;
    }
    return null;
}

/* ------------------------------------------------------------------ */
/* inline parser                                                       */
/* ------------------------------------------------------------------ */

function classFor(bold, italic, code) {
    const parts = [];
    if (bold) {
        parts.push('b');
    }
    if (italic) {
        parts.push('i');
    }
    if (code) {
        parts.push('c');
    }
    return parts.join(' ');
}

function extractHref(attrs) {
    const low = asciiLower(attrs);
    let from = 0;
    for (;;) {
        const idx = low.indexOf('href', from);
        if (idx < 0) {
            return null;
        }
        const before = idx === 0 ? ' ' : low.charAt(idx - 1);
        if (before !== ' ' && before !== '\t' && before !== '\n') {
            from = idx + 4;
            continue;
        }
        let j = idx + 4;
        while (low.charAt(j) === ' ') {
            j++;
        }
        if (low.charAt(j) !== '=') {
            from = idx + 4;
            continue;
        }
        j++;
        while (low.charAt(j) === ' ') {
            j++;
        }
        const q = attrs.charAt(j);
        if (q === '"' || q === "'") {
            const end = attrs.indexOf(q, j + 1);
            return end < 0 ? null : attrs.slice(j + 1, end);
        }
        let end = j;
        while (end < attrs.length && ' \t\n'.indexOf(attrs.charAt(end)) === -1) {
            end++;
        }
        return attrs.slice(j, end);
    }
}

function parseInline(input, ctx, inLink, outerBold, outerItalic) {
    const out = [];
    const s = input;
    const len = s.length;
    const lower = asciiLower(s);
    const noClose = Object.create(null); // "no closer exists after here" cache => linear time
    let i = 0;
    let buf = '';
    let boldCh = '';
    let italicCh = '';

    const emit = (text, code) => {
        if (!text) {
            return null;
        }
        if (++ctx.segs > LIMITS.MAX_SEGMENTS) {
            ctx.overflow = true;
            return null;
        }
        const seg = {
            key: 's' + ctx.n++,
            text,
            cls: classFor(boldCh !== '' || outerBold, italicCh !== '' || outerItalic, code),
            isLink: false,
            isBreak: false,
            href: null,
            target: null,
            rel: null
        };
        out.push(seg);
        return seg;
    };
    const flush = () => {
        if (buf) {
            emit(buf, false);
            buf = '';
        }
    };
    const emitBreak = () => {
        if (++ctx.segs > LIMITS.MAX_SEGMENTS) {
            ctx.overflow = true;
            return;
        }
        out.push({
            key: 's' + ctx.n++,
            text: '',
            cls: '',
            isLink: false,
            isBreak: true,
            href: null,
            target: null,
            rel: null
        });
    };
    const linkify = (seg, safe) => {
        seg.isLink = true;
        seg.href = safe.href;
        seg.target = safe.kind === 'absolute' ? '_blank' : '_self';
        seg.rel = 'noopener noreferrer';
        seg.cls = seg.cls ? seg.cls + ' lnk' : 'lnk';
    };
    const emitLink = (label, safe) => {
        const seg = emit(label, false);
        if (seg) {
            linkify(seg, safe);
        }
    };
    const hasCloser = (delim, from) => {
        if (noClose[delim]) {
            return false;
        }
        if (s.indexOf(delim, from) < 0) {
            noClose[delim] = true;
            return false;
        }
        return true;
    };
    // label may contain emphasis/code; it never contains links (inLink=true)
    const appendLabel = (label, safe, fallback) => {
        const segs = label.trim()
            ? parseInline(label, ctx, true, boldCh !== '' || outerBold, italicCh !== '' || outerItalic)
            : [];
        if (!segs.length) {
            if (safe) {
                emitLink(fallback, safe);
            }
            return;
        }
        for (const seg of segs) {
            if (safe && !seg.isBreak) {
                linkify(seg, safe);
            }
            out.push(seg);
        }
    };

    const tryLink = (at) => {
        const open = s.charAt(at) === '!' ? at + 1 : at;
        if (noClose.bracket) {
            return -1;
        }
        const close = s.indexOf(']', open + 1);
        if (close < 0) {
            noClose.bracket = true;
            return -1;
        }
        if (close - open > 500 || s.charAt(close + 1) !== '(') {
            return -1;
        }
        let depth = 1;
        let j = close + 2;
        const limit = Math.min(len, j + LIMITS.MAX_URL_LENGTH + 200);
        while (j < limit && depth > 0) {
            const c = s.charAt(j);
            if (c === '\n') {
                return -1;
            }
            if (c === '(') {
                depth++;
            } else if (c === ')') {
                depth--;
            }
            j++;
        }
        ctx.budget -= j - close;
        if (ctx.budget < 0 || depth !== 0) {
            return -1;
        }
        const end = j - 1;
        const inner = s.slice(close + 2, end).trim();
        let k = 0;
        while (k < inner.length && ' \t\n'.indexOf(inner.charAt(k)) === -1) {
            k++;
        }
        let url = inner.slice(0, k);
        if (url.charAt(0) === '<' && url.charAt(url.length - 1) === '>') {
            url = url.slice(1, -1);
        }
        const label = s.slice(open + 1, close);
        flush();
        appendLabel(label, sanitizeUrl(url), url);
        return end + 1;
    };

    const tryHtml = (at) => {
        if (lower.startsWith('<br', at)) {
            let j = at + 3;
            while (s.charAt(j) === ' ' || s.charAt(j) === '/') {
                j++;
            }
            if (s.charAt(j) === '>') {
                flush();
                emitBreak();
                return j + 1;
            }
        }
        if (inLink || noClose.gt) {
            return -1;
        }
        const gt = s.indexOf('>', at + 1);
        if (gt < 0) {
            noClose.gt = true;
            return -1;
        }
        if (lower.startsWith('<http', at)) {
            if (gt - at <= LIMITS.MAX_URL_LENGTH) {
                const url = s.slice(at + 1, gt);
                const safe = sanitizeUrl(url);
                if (safe) {
                    flush();
                    emitLink(url, safe);
                    return gt + 1;
                }
            }
            return -1;
        }
        const c2 = s.charAt(at + 2);
        if (lower.startsWith('<a', at) && (c2 === ' ' || c2 === '\t' || c2 === '\n')) {
            if (gt - at > 2200 || noClose.closeA) {
                return -1;
            }
            const href = extractHref(s.slice(at + 2, gt));
            const closeIdx = lower.indexOf('</a>', gt + 1);
            if (closeIdx < 0) {
                noClose.closeA = true;
                return -1;
            }
            if (href === null || closeIdx - gt > 5000) {
                return -1;
            }
            const safe = sanitizeUrl(href.split('&amp;').join('&'));
            flush();
            appendLabel(s.slice(gt + 1, closeIdx), safe, href);
            return closeIdx + 4;
        }
        return -1;
    };

    const scanUrlEnd = (at) => {
        let j = at;
        const max = Math.min(len, at + LIMITS.MAX_URL_LENGTH);
        while (j < max) {
            const c = s.charAt(j);
            if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '<' || c === '>' || c === '"') {
                break;
            }
            j++;
        }
        return j - at >= LIMITS.MAX_URL_LENGTH ? -1 : j;
    };

    const tryBareUrl = (at) => {
        const isHttp = lower.startsWith('http://', at) || lower.startsWith('https://', at);
        if (!isHttp && !lower.startsWith('www.', at)) {
            return -1;
        }
        if (isAlnum(at > 0 ? s.charAt(at - 1) : '')) {
            return -1;
        }
        const j = scanUrlEnd(at);
        if (j < 0) {
            return -1;
        }
        const url = trimUrlTail(s.slice(at, j));
        const safe = sanitizeUrl(url);
        if (!safe) {
            return -1;
        }
        flush();
        emitLink(url, safe);
        return at + url.length;
    };

    const tryPath = (at) => {
        if (!ctx.prefixes.length) {
            return -1;
        }
        if (at > 0 && !isBlank(s.charAt(at - 1)) && s.charAt(at - 1) !== '(') {
            return -1;
        }
        for (const pre of ctx.prefixes) {
            if (typeof pre === 'string' && pre.charAt(0) === '/' && s.startsWith(pre, at)) {
                const j = scanUrlEnd(at);
                if (j < 0) {
                    return -1;
                }
                const url = trimUrlTail(s.slice(at, j));
                const safe = sanitizeUrl(url);
                if (safe && safe.kind === 'relative') {
                    flush();
                    emitLink(url, safe);
                    return at + url.length;
                }
            }
        }
        return -1;
    };

    while (i < len && !ctx.overflow) {
        const ch = s.charAt(i);
        const prev = i > 0 ? s.charAt(i - 1) : '';

        if (ch === '\\' && i + 1 < len && ESCAPABLE.indexOf(s.charAt(i + 1)) !== -1) {
            buf += s.charAt(i + 1);
            i += 2;
            continue;
        }

        if (ch === '\n') {
            flush();
            emitBreak();
            i++;
            continue;
        }

        if (ch === '`') {
            let n = 1;
            while (s.charAt(i + n) === '`') {
                n++;
            }
            const fence = '`'.repeat(n);
            const cacheKey = 'tick' + n;
            let end = -1;
            if (!noClose[cacheKey]) {
                let from = i + n;
                for (;;) {
                    end = s.indexOf(fence, from);
                    if (end < 0) {
                        break;
                    }
                    if (s.charAt(end + n) === '`') {
                        let e2 = end;
                        while (s.charAt(e2) === '`') {
                            e2++;
                        }
                        from = e2;
                        continue;
                    }
                    break;
                }
                if (end < 0) {
                    noClose[cacheKey] = true;
                }
            }
            if (end < 0) {
                buf += fence;
                i += n;
            } else {
                flush();
                emit(s.slice(i + n, end), true);
                i = end + n;
            }
            continue;
        }

        if (ch === '*' || ch === '_') {
            let run = 1;
            while (s.charAt(i + run) === ch) {
                run++;
            }
            const next = s.charAt(i + run);
            const prevBlank = isBlank(prev);
            const nextBlank = isBlank(next);
            let rem = run;
            let closed = false;
            if (!(ch === '_' && isAlnum(prev))) {
                if (!prevBlank) {
                    if (rem >= 2 && boldCh === ch) {
                        flush();
                        boldCh = '';
                        rem -= 2;
                        closed = true;
                    }
                    if (rem >= 1 && italicCh === ch) {
                        flush();
                        italicCh = '';
                        rem -= 1;
                        closed = true;
                    }
                }
                if (!closed && !nextBlank) {
                    if (rem >= 2 && boldCh === '' && hasCloser(ch + ch, i + run)) {
                        flush();
                        boldCh = ch;
                        rem -= 2;
                    }
                    if (rem >= 1 && italicCh === '' && hasCloser(ch, i + run)) {
                        flush();
                        italicCh = ch;
                        rem -= 1;
                    }
                }
            }
            if (rem > 0) {
                buf += ch.repeat(rem);
            }
            i += run;
            continue;
        }

        if (!inLink && (ch === '[' || (ch === '!' && s.charAt(i + 1) === '['))) {
            const r = tryLink(i);
            if (r > 0) {
                i = r;
                continue;
            }
        }

        if (ch === '<') {
            const r = tryHtml(i);
            if (r > 0) {
                i = r;
                continue;
            }
        }

        if (!inLink) {
            if (ch === 'h' || ch === 'H' || ch === 'w' || ch === 'W') {
                const r = tryBareUrl(i);
                if (r > 0) {
                    i = r;
                    continue;
                }
            } else if (ch === '/') {
                const r = tryPath(i);
                if (r > 0) {
                    i = r;
                    continue;
                }
            }
        }

        buf += ch;
        i++;
    }
    flush();
    return out;
}

/* ------------------------------------------------------------------ */
/* block parser                                                        */
/* ------------------------------------------------------------------ */

function leadingSpaces(line) {
    let n = 0;
    for (let p = 0; p < line.length; p++) {
        const c = line.charAt(p);
        if (c === ' ') {
            n++;
        } else if (c === '\t') {
            n += 4;
        } else {
            break;
        }
    }
    return n;
}

function allChar(t, ch) {
    for (let i = 0; i < t.length; i++) {
        if (t.charAt(i) !== ch) {
            return false;
        }
    }
    return t.length > 0;
}

function fenceInfo(line) {
    const t = line.trimStart();
    const c = t.charAt(0);
    if (c !== '`' && c !== '~') {
        return null;
    }
    let n = 0;
    while (t.charAt(n) === c) {
        n++;
    }
    if (n < 3 || (c === '`' && t.indexOf('`', n) !== -1)) {
        return null;
    }
    return { ch: c, n };
}

function headingInfo(line) {
    const t = line.trimStart();
    let n = 0;
    while (t.charAt(n) === '#') {
        n++;
    }
    if (n < 1 || n > 6) {
        return null;
    }
    if (t.length > n && t.charAt(n) !== ' ' && t.charAt(n) !== '\t') {
        return null;
    }
    let text = t.slice(n).trim();
    let e = text.length;
    while (e > 0 && text.charAt(e - 1) === '#') {
        e--;
    }
    if (e < text.length && (e === 0 || text.charAt(e - 1) === ' ')) {
        text = text.slice(0, e).trim();
    }
    return { level: n, text };
}

function isRule(line) {
    const t = line.trim();
    if (t.length < 3) {
        return false;
    }
    const c = t.charAt(0);
    if (c !== '-' && c !== '*' && c !== '_') {
        return false;
    }
    let count = 0;
    for (let i = 0; i < t.length; i++) {
        const x = t.charAt(i);
        if (x === c) {
            count++;
        } else if (x !== ' ') {
            return false;
        }
    }
    return count >= 3;
}

function listInfo(line) {
    let indent = 0;
    let p = 0;
    while (p < line.length) {
        const c = line.charAt(p);
        if (c === ' ') {
            indent++;
        } else if (c === '\t') {
            indent += 4;
        } else {
            break;
        }
        p++;
    }
    const rest = line.slice(p);
    const c0 = rest.charAt(0);
    if ((c0 === '-' || c0 === '*' || c0 === '+') && (rest.charAt(1) === ' ' || rest.charAt(1) === '\t')) {
        return { indent, ordered: false, num: 0, content: rest.slice(2).trim() };
    }
    let d = 0;
    while (d < 10 && isDigit(rest.charAt(d))) {
        d++;
    }
    if (d >= 1 && d <= 9 && (rest.charAt(d) === '.' || rest.charAt(d) === ')')) {
        const sp = rest.charAt(d + 1);
        if (sp === ' ' || sp === '\t') {
            return { indent, ordered: true, num: parseInt(rest.slice(0, d), 10), content: rest.slice(d + 2).trim() };
        }
    }
    return null;
}

function splitRow(line) {
    let t = line.trim();
    if (t.charAt(0) === '|') {
        t = t.slice(1);
    }
    if (t.charAt(t.length - 1) === '|' && t.charAt(t.length - 2) !== '\\') {
        t = t.slice(0, -1);
    }
    const cells = [];
    let cur = '';
    for (let i = 0; i < t.length; i++) {
        const c = t.charAt(i);
        if (c === '\\' && t.charAt(i + 1) === '|') {
            cur += '|';
            i++;
        } else if (c === '|') {
            cells.push(cur);
            cur = '';
            if (cells.length > LIMITS.MAX_TABLE_COLS) {
                return cells;
            }
        } else {
            cur += c;
        }
    }
    cells.push(cur);
    return cells;
}

function isSepCell(cell) {
    const t = cell.trim();
    let k = 0;
    if (t.charAt(k) === ':') {
        k++;
    }
    let dashes = 0;
    while (t.charAt(k) === '-') {
        k++;
        dashes++;
    }
    if (t.charAt(k) === ':') {
        k++;
    }
    return dashes >= 1 && k === t.length;
}

function isTableStart(lines, i) {
    if (i + 1 >= lines.length || lines[i].indexOf('|') === -1 || lines[i + 1].indexOf('-') === -1) {
        return false;
    }
    const head = splitRow(lines[i]);
    const sep = splitRow(lines[i + 1]);
    return head.length === sep.length && sep.every(isSepCell);
}

function alignClass(cell) {
    const t = cell.trim();
    const l = t.charAt(0) === ':';
    const r = t.charAt(t.length - 1) === ':';
    if (l && r) {
        return 'al-c';
    }
    return r ? 'al-r' : '';
}

function startsBlock(lines, i) {
    const line = lines[i];
    return (
        fenceInfo(line) !== null ||
        headingInfo(line) !== null ||
        isRule(line) ||
        listInfo(line) !== null ||
        line.trimStart().charAt(0) === '>' ||
        isTableStart(lines, i)
    );
}

function plainResult(text) {
    return {
        blocks: [{ key: 'b0', isPlain: true, text }],
        degraded: true
    };
}

function parseList(lines, start, ctx) {
    const first = listInfo(lines[start]);
    const ordered = first.ordered;
    const items = [];
    let cur = null;
    let i = start;

    while (i < lines.length && !ctx.overflow) {
        const line = lines[i];
        if (line.trim() === '') {
            let j = i + 1;
            while (j < lines.length && lines[j].trim() === '') {
                j++;
            }
            if (j >= lines.length) {
                i = j;
                break;
            }
            const nxt = listInfo(lines[j]);
            if (nxt && (nxt.indent >= 2 || nxt.ordered === ordered)) {
                i = j;
                continue;
            }
            if (!nxt && cur && leadingSpaces(lines[j]) >= 2 && !startsBlock(lines, j)) {
                const target = cur.subs.length ? cur.subs[cur.subs.length - 1] : cur;
                target.text += '\n' + lines[j].trim();
                i = j + 1;
                continue;
            }
            break;
        }
        const info = listInfo(line);
        if (info) {
            if (++ctx.listItems > LIMITS.MAX_LIST_ITEMS) {
                ctx.overflow = true;
                break;
            }
            if (info.indent >= 2 && cur) {
                cur.subs.push({ text: info.content, ordered: info.ordered });
            } else {
                if (info.ordered !== ordered) {
                    break;
                }
                cur = { text: info.content, subs: [] };
                items.push(cur);
            }
            i++;
            continue;
        }
        if (cur && leadingSpaces(line) >= 2 && !startsBlock(lines, i)) {
            const target = cur.subs.length ? cur.subs[cur.subs.length - 1] : cur;
            target.text += '\n' + line.trim();
            i++;
            continue;
        }
        break;
    }

    const block = {
        key: 'b' + ctx.n++,
        isOrderedList: ordered,
        isBulletList: !ordered,
        start: ordered && first.num > 0 ? first.num : 1,
        items: items.map((it) => ({
            key: 'i' + ctx.n++,
            segments: parseInline(it.text, ctx, false, false, false),
            hasSubs: it.subs.length > 0,
            subOrdered: it.subs.length > 0 && it.subs[0].ordered,
            subs: it.subs.map((sub) => ({
                key: 'i' + ctx.n++,
                segments: parseInline(sub.text, ctx, false, false, false)
            }))
        }))
    };
    return { block, next: i };
}

/**
 * Parse message text into renderable blocks.
 * @param {string} text
 * @param {{linkPathPrefixes?: string[]}} [options]
 * @returns {{blocks: object[], degraded: boolean}}
 */
export function parseMessage(text, options) {
    const opts = options || {};
    const raw = typeof text === 'string' ? text : text === null || text === undefined ? '' : String(text);
    if (raw.length > LIMITS.MAX_CHARS) {
        return plainResult(raw.slice(0, LIMITS.MAX_CHARS));
    }
    const src = raw.replace(/\r\n?/g, '\n');
    const lines = src.split('\n');
    if (lines.length > LIMITS.MAX_LINES) {
        return plainResult(src);
    }

    const ctx = {
        n: 0,
        segs: 0,
        overflow: false,
        listItems: 0,
        budget: LIMITS.MAX_SCAN_BUDGET,
        prefixes: Array.isArray(opts.linkPathPrefixes) ? opts.linkPathPrefixes.slice(0, 20) : []
    };
    const blocks = [];
    let i = 0;

    while (i < lines.length && !ctx.overflow) {
        if (blocks.length >= LIMITS.MAX_BLOCKS) {
            ctx.overflow = true;
            break;
        }
        const line = lines[i];
        if (line.trim() === '') {
            i++;
            continue;
        }

        const fence = fenceInfo(line);
        if (fence) {
            const body = [];
            i++;
            while (i < lines.length) {
                const t = lines[i].trim();
                if (t.length >= fence.n && allChar(t, fence.ch)) {
                    i++;
                    break;
                }
                body.push(lines[i]);
                i++;
            }
            blocks.push({ key: 'b' + ctx.n++, isCode: true, text: body.join('\n') });
            continue;
        }

        if (isRule(line)) {
            blocks.push({ key: 'b' + ctx.n++, isRule: true });
            i++;
            continue;
        }

        const heading = headingInfo(line);
        if (heading) {
            if (heading.text) {
                blocks.push({
                    key: 'b' + ctx.n++,
                    isHeading: true,
                    cls: 'h h' + Math.min(heading.level, 4),
                    ariaLevel: String(heading.level),
                    segments: parseInline(heading.text, ctx, false, false, false)
                });
            }
            i++;
            continue;
        }

        if (isTableStart(lines, i)) {
            const head = splitRow(lines[i]).slice(0, LIMITS.MAX_TABLE_COLS);
            const aligns = splitRow(lines[i + 1]).map(alignClass);
            const cols = head.length;
            i += 2;
            const rows = [];
            let hasMore = false;
            while (i < lines.length && lines[i].trim() !== '' && lines[i].indexOf('|') !== -1) {
                if (rows.length >= LIMITS.MAX_TABLE_ROWS) {
                    hasMore = true;
                } else {
                    const cells = splitRow(lines[i]);
                    const rowCells = [];
                    for (let c = 0; c < cols; c++) {
                        rowCells.push({
                            key: 'c' + ctx.n++,
                            cls: aligns[c] || '',
                            segments: parseInline((cells[c] || '').trim(), ctx, false, false, false)
                        });
                    }
                    rows.push({ key: 'r' + ctx.n++, cells: rowCells });
                }
                i++;
            }
            blocks.push({
                key: 'b' + ctx.n++,
                isTable: true,
                hasMore,
                header: head.map((h, c) => ({
                    key: 'c' + ctx.n++,
                    cls: aligns[c] || '',
                    segments: parseInline(h.trim(), ctx, false, false, false)
                })),
                rows
            });
            continue;
        }

        if (line.trimStart().charAt(0) === '>') {
            const q = [];
            while (i < lines.length) {
                const t = lines[i].trimStart();
                if (t.charAt(0) !== '>') {
                    break;
                }
                let c = t.slice(1);
                if (c.charAt(0) === ' ') {
                    c = c.slice(1);
                }
                q.push(c);
                i++;
            }
            blocks.push({
                key: 'b' + ctx.n++,
                isQuote: true,
                segments: parseInline(q.join('\n').trim(), ctx, false, false, false)
            });
            continue;
        }

        if (listInfo(line)) {
            const res = parseList(lines, i, ctx);
            blocks.push(res.block);
            i = res.next;
            continue;
        }

        const para = [line.trim()];
        i++;
        while (i < lines.length && lines[i].trim() !== '' && !startsBlock(lines, i)) {
            para.push(lines[i].trim());
            i++;
        }
        blocks.push({
            key: 'b' + ctx.n++,
            isParagraph: true,
            segments: parseInline(para.join('\n'), ctx, false, false, false)
        });
    }

    if (ctx.overflow) {
        return plainResult(src);
    }
    return { blocks, degraded: false };
}

/** Calls cb(segmentsArray) for every inline segment list inside the blocks. */
export function forEachSegmentList(blocks, cb) {
    for (const b of blocks) {
        if (b.segments) {
            cb(b.segments);
        }
        if (b.items) {
            for (const it of b.items) {
                cb(it.segments);
                for (const sub of it.subs) {
                    cb(sub.segments);
                }
            }
        }
        if (b.header) {
            for (const c of b.header) {
                cb(c.segments);
            }
        }
        if (b.rows) {
            for (const r of b.rows) {
                for (const c of r.cells) {
                    cb(c.segments);
                }
            }
        }
    }
}