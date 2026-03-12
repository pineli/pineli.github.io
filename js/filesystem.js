// ===========================================
// Filesystem — estado, navegação, e fetch
// ===========================================

/** Árvore de arquivos carregada do manifest.json */
let fileSystem = {};

/** Diretório atual do terminal */
let currentPath = '~';

// ---------------------
// Getters / Setters
// ---------------------

export function getFileSystem() { return fileSystem; }
export function setFileSystem(fs) { fileSystem = fs; }
export function getCurrentPath() { return currentPath; }
export function setCurrentPath(path) { currentPath = path; }

// ---------------------
// Resolução de caminhos
// ---------------------

/**
 * Resolve um caminho relativo ou absoluto para um caminho completo.
 * Suporta: ~, /, ./, .., caminhos relativos
 */
export function resolvePath(path) {
    if (path === '~' || path === '') return '~';

    let parts;
    if (path.startsWith('~/')) {
        parts = ['~', ...path.slice(2).split('/').filter(Boolean)];
    } else if (path.startsWith('/')) {
        parts = ['~', ...path.slice(1).split('/').filter(Boolean)];
    } else if (path.startsWith('./')) {
        parts = [...currentPath.split('/'), ...path.slice(2).split('/').filter(Boolean)];
    } else {
        parts = [...currentPath.split('/'), ...path.split('/').filter(Boolean)];
    }

    const resolved = [];
    for (const part of parts) {
        if (part === '..') {
            if (resolved.length > 1) resolved.pop();
        } else if (part !== '.') {
            resolved.push(part);
        }
    }

    return resolved.join('/');
}

/**
 * Busca um nó na árvore do filesystem pelo caminho.
 * Retorna null se não encontrou.
 */
export function getNode(path) {
    const parts = path.split('/').filter(Boolean);
    let node = fileSystem;

    for (const part of parts) {
        if (node && node[part]) {
            node = node[part];
        } else if (node && node.children && node.children[part]) {
            node = node.children[part];
        } else {
            return null;
        }
    }

    return node;
}

// ---------------------
// Utilitários de arquivo
// ---------------------

/** Converte caminho do filesystem para URL relativa (para fetch) */
export function fsPathToUrl(fsPath) {
    return '/fs/' + fsPath.replace(/^~\/?/, '');
}

/** Retorna a extensão do arquivo (com ponto, minúscula) */
export function getExtension(filename) {
    const dot = filename.lastIndexOf('.');
    return dot >= 0 ? filename.substring(dot).toLowerCase() : '';
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

export function isImageFile(f) { return IMAGE_EXTENSIONS.includes(getExtension(f)); }
export function isHtmlFile(f) { return getExtension(f) === '.html'; }
export function isMarkdownFile(f) { return getExtension(f) === '.md'; }
export function isExecutable(f) { return getExtension(f) === '.sh'; }

/**
 * Retorna a string de permissão no estilo ls -la.
 * Diretórios: drwxr-xr-x | Executáveis: -rwxr-xr-- | Outros: -rw-r--r--
 */
export function getPermissions(name, isDir) {
    if (isDir) return 'drwxr-xr-x';
    if (isExecutable(name)) return '-rwxr-xr--';
    return '-rw-r--r--';
}

/**
 * Lista nomes dos filhos de um diretório (para autocomplete).
 * Diretórios ganham "/" no final.
 */
export function getChildNames(dirPath) {
    const node = getNode(dirPath);
    if (!node || node.type !== 'dir') return [];
    return Object.keys(node.children || {}).map(n =>
        (node.children[n].type === 'dir') ? n + '/' : n
    );
}

// ---------------------
// Fetch de arquivos
// ---------------------

/** Busca o conteúdo de texto de um arquivo via HTTP */
export async function fetchFile(fsPath) {
    const url = fsPathToUrl(fsPath);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } catch {
        return null;
    }
}
