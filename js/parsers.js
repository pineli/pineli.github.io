// ===========================================
// Parsers — markdown, front matter, shell args
// ===========================================

/**
 * Converte markdown em HTML básico.
 * Suporta: headings, bold, italic, code blocks, inline code,
 * blockquotes, listas, e horizontal rules.
 */
export function parseMarkdown(md, escapeHtml) {
    let html = md;

    // Fenced code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings (h3 → h1 order matters)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Bold & italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');

    // Wrap remaining plain lines in <p> tags (skip HTML elements and code blocks)
    const lines = html.split('\n');
    const result = [];
    let inPre = false;

    for (const line of lines) {
        if (line.includes('<pre>')) inPre = true;
        if (line.includes('</pre>')) { inPre = false; result.push(line); continue; }
        if (inPre) { result.push(line); continue; }

        const trimmed = line.trim();
        if (!trimmed) { result.push(''); continue; }
        if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|div|table)/.test(trimmed)) {
            result.push(line);
        } else {
            result.push(`<p>${line}</p>`);
        }
    }

    return result.join('\n');
}

/**
 * Extrai metadados YAML front matter de um arquivo markdown.
 * Retorna { meta: {...}, body: "conteúdo sem front matter" }
 */
export function parseFrontMatter(text) {
    const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: text };

    const meta = {};
    match[1].split('\n').forEach(line => {
        const idx = line.indexOf(':');
        if (idx > 0) {
            const key = line.substring(0, idx).trim();
            let val = line.substring(idx + 1).trim();

            // Remove aspas ao redor do valor
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            meta[key] = val;
        }
    });

    return { meta, body: match[2] };
}

/**
 * Faz parse de argumentos no estilo shell, respeitando aspas.
 * Ex: 'echo "hello world"' → ['echo', 'hello world']
 */
export function parseShellArgs(input) {
    const args = [];
    let current = '';
    let inDouble = false;
    let inSingle = false;

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
        if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
        if (ch === ' ' && !inDouble && !inSingle) {
            if (current) { args.push(current); current = ''; }
            continue;
        }
        current += ch;
    }

    if (current) args.push(current);
    return args;
}

/**
 * Faz parse de arquivos .ascgif
 * Extai meta dados (fps, loop) do front matter e separa os frames (===FRAME===)
 */
export function parseAscGif(text) {
    const { meta, body } = parseFrontMatter(text);
    const frames = body.split('===FRAME===').map(f => f.replace(/^\n/, '').replace(/\n$/, ''));
    
    return {
        fps: parseInt(meta.fps, 10) || 5,
        loop: meta.loop === 'true' || meta.loop === true,
        frames
    };
}
