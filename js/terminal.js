// ===========================================
// Terminal — UI do terminal e autocomplete
// ===========================================

import { getCurrentPath, getChildNames, resolvePath } from './filesystem.js';

// ---------------------
// Referências DOM
// ---------------------

const terminalInput = document.getElementById('terminal-input');
const terminalOutput = document.getElementById('terminal-output');
const terminalScroll = document.getElementById('terminal-scroll');
const promptDisplay = document.getElementById('prompt-display');

// ---------------------
// Estado do autocomplete
// ---------------------

const ghostEl = document.createElement('span');
ghostEl.className = 'autocomplete-ghost';
ghostEl.setAttribute('aria-hidden', 'true');
terminalInput.parentElement.appendChild(ghostEl);

let currentSuggestion = '';

// ---------------------
// Estado do histórico
// ---------------------

let commandHistory = [];
try {
    const stored = localStorage.getItem('pinelidev_history');
    if (stored) commandHistory = JSON.parse(stored);
} catch (e) {}

let historyIndex = commandHistory.length;

// ---------------------
// Funções de output
// ---------------------

/** Retorna referência ao input do terminal */
export function getInput() { return terminalInput; }

/** Retorna referência ao container de output */
export function getOutput() { return terminalOutput; }

/** Retorna referência ao scroll container */
export function getScroll() { return terminalScroll; }

/** Gera o texto do prompt: pineli@dev:~$ */
export function formatPrompt() {
    return `pineli@dev:${getCurrentPath()}$`;
}

/** Atualiza o prompt exibido na tela */
export function updatePrompt() {
    promptDisplay.innerHTML = `${formatPrompt()}&nbsp;`;
}

/** Escapa caracteres HTML para exibição segura */
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/** Adiciona uma linha de texto simples ao terminal */
export function addOutput(text, className = 'result') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.textContent = text;
    terminalOutput.appendChild(line);
}

/** Adiciona uma linha com HTML ao terminal */
export function addHtmlOutput(html, className = 'result') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.innerHTML = html;
    terminalOutput.appendChild(line);
}

/**
 * Adiciona um bloco de conteúdo rico (HTML) ao terminal.
 * Elementos com data-cmd ficam clicáveis.
 * @param {Function} onCommand - callback para executar comandos ao clicar
 */
export function addRichBlock(html, onCommand) {
    const container = document.createElement('div');
    container.className = 'rich-output';
    container.innerHTML = html;
    terminalOutput.appendChild(container);

    container.querySelectorAll('[data-cmd]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (onCommand) onCommand(el.getAttribute('data-cmd'));
        });
    });
}

/** Adiciona um bloco de texto puro (pre/code) */
export function addPlainBlock(text) {
    const pre = document.createElement('pre');
    pre.className = 'rich-output';
    const code = document.createElement('code');
    code.textContent = text;
    pre.appendChild(code);
    terminalOutput.appendChild(pre);
}

/** Cria e retorna um elemento para animações em tempo real */
export function createLiveBlock(className = 'live-output', cols = 0, rows = 0) {
    const block = document.createElement('pre');
    block.className = className;
    
    // Configura o tamanho fixo baseado nos requisitos do ASCGIF
    if (cols > 0) {
        block.style.width = `${cols}ch`;
        block.style.maxWidth = '100%';
        block.style.overflowX = 'hidden';
    } else {
        block.style.width = 'max-content';
    }
    
    if (rows > 0) {
        // line-height default do terminal é 1.6
        block.style.height = `calc(${rows} * 1.6em + 32px)`; // 32px é o padding do pre (16px top + 16px bottom)
        block.style.overflowY = 'hidden';
    }

    const code = document.createElement('code');
    block.appendChild(code);
    
    // Insere no final mas deixa uma linha em branco para o novo prompt
    const container = document.createElement('div');
    container.className = 'rich-output';
    container.appendChild(block);
    
    terminalOutput.appendChild(container);
    return code; // Retorna o elemento <code> para o app atualizar
}

/** Rola o terminal até o final */
export function scrollToBottom() {
    requestAnimationFrame(() => {
        terminalScroll.scrollTop = terminalScroll.scrollHeight;
    });
}

// ---------------------
// Histórico de comandos
// ---------------------

export function getCommandHistory() { return commandHistory; }
export function getHistoryIndex() { return historyIndex; }
export function setHistoryIndex(idx) { historyIndex = idx; }

export function pushHistory(cmd) {
    commandHistory.push(cmd);
    if (commandHistory.length > 1000) commandHistory.shift(); // keep it constrained to simulate a finite .bash_history
    historyIndex = commandHistory.length;
    try {
        localStorage.setItem('pinelidev_history', JSON.stringify(commandHistory));
    } catch (e) {}
}

// ---------------------
// Autocomplete
// ---------------------

/**
 * Lista de nomes de comandos disponíveis.
 * Usada pelo autocomplete para sugerir comandos.
 */
const COMMAND_NAMES = [
    'help', 'ls', 'cd', 'cat', 'pwd', 'whoami', 'date', 'echo',
    'clear', 'history',
    'tree', 'ssh', 'sh', 'bash', 'uname', 'uptime', 'open', 'view', 'close',
    'alias', 'source', 'export', 'ascgif', 'reboot'
];

export function getCommandNames() { return COMMAND_NAMES; }

/** Retorna lista de sugestões de autocomplete para o input dado */
export function getCompletions(input) {
    const trimmed = input.trimStart();
    if (!trimmed) return [];

    const parts = trimmed.split(/\s+/);

    // Completar nome do comando
    if (parts.length === 1 && !trimmed.endsWith(' ')) {
        const partial = parts[0].toLowerCase();
        return COMMAND_NAMES.filter(c => c.startsWith(partial) && c !== partial);
    }

    // Completar argumento de arquivo/diretório
    const lastArg = parts[parts.length - 1];
    if (trimmed.endsWith(' ')) return getChildNames(getCurrentPath());

    let dirPath, partial;
    const lastSlash = lastArg.lastIndexOf('/');

    if (lastSlash >= 0) {
        dirPath = resolvePath(lastArg.substring(0, lastSlash + 1));
        partial = lastArg.substring(lastSlash + 1);
    } else {
        dirPath = getCurrentPath();
        partial = lastArg;
    }

    if (partial.startsWith('-')) return [];
    return getChildNames(dirPath).filter(n =>
        n.toLowerCase().startsWith(partial.toLowerCase()) && n !== partial
    );
}

/** Retorna a melhor sugestão (sufixo a completar) */
export function getBestCompletion(input) {
    const completions = getCompletions(input);
    if (!completions.length) return '';

    const trimmed = input.trimStart();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 1 && !trimmed.endsWith(' ')) {
        return completions[0].substring(parts[0].length);
    }
    if (trimmed.endsWith(' ')) return completions[0];

    const lastArg = parts[parts.length - 1];
    const lastSlash = lastArg.lastIndexOf('/');
    const partial = lastSlash >= 0 ? lastArg.substring(lastSlash + 1) : lastArg;

    if (partial.startsWith('-')) return '';
    return completions[0].substring(partial.length);
}

/** Atualiza o texto-fantasma do autocomplete */
export function updateGhost() {
    const val = terminalInput.value;
    if (!val) { ghostEl.textContent = ''; currentSuggestion = ''; return; }

    const suggestion = getBestCompletion(val);
    currentSuggestion = suggestion;
    ghostEl.textContent = suggestion;

    // Medir largura do texto atual para posicionar o ghost
    const measure = document.createElement('span');
    measure.style.cssText = 'font-family:var(--font-mono);font-size:0.85rem;visibility:hidden;position:absolute;white-space:pre;';
    measure.textContent = val;
    document.body.appendChild(measure);
    ghostEl.style.left = measure.offsetWidth + 'px';
    document.body.removeChild(measure);
}

/** Aceita a sugestão do autocomplete */
export function acceptSuggestion() {
    if (currentSuggestion) {
        terminalInput.value += currentSuggestion;
        currentSuggestion = '';
        ghostEl.textContent = '';
        updateGhost();
    }
}

/** Retorna a sugestão atual (para verificações externas) */
export function getCurrentSuggestion() { return currentSuggestion; }

/** Limpa sugestão e ghost text */
export function clearSuggestion() {
    currentSuggestion = '';
    ghostEl.textContent = '';
}
