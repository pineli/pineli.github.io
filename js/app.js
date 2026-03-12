// ===========================================
// App — ponto de entrada, boot e event listeners
// ===========================================

import { setFileSystem } from './filesystem.js';
import {
    getInput, formatPrompt, addOutput, addHtmlOutput,
    scrollToBottom, updateGhost, acceptSuggestion, getCompletions,
    getCurrentSuggestion, clearSuggestion, escapeHtml,
    getCommandHistory, getHistoryIndex, setHistoryIndex
} from './terminal.js';
import { closeViewerPanel, isViewerOpen, setProcessCommandCallback } from './viewer.js';
import { processCommand, commands, sourceBashrc, interruptApp } from './commands/index.js';

import { getInitialCommand } from './router.js';

// ---------------------
// Conectar viewer ao processCommand
// ---------------------

setProcessCommandCallback(processCommand);

// ---------------------
// Referências DOM
// ---------------------

const terminalInput = getInput();
const splitContainer = document.getElementById('split-container');
const terminalScroll = document.getElementById('terminal-scroll');

// ---------------------
// Event Listeners
// ---------------------

terminalInput.addEventListener('keydown', function (e) {
    const commandHistory = getCommandHistory();

    if (e.key === 'Enter') {
        processCommand(this.value);
        this.value = '';
        clearSuggestion();

    } else if (e.key === 'Tab') {
        e.preventDefault();
        if (getCurrentSuggestion()) {
            acceptSuggestion();
        } else {
            const completions = getCompletions(this.value);
            if (completions.length > 1) {
                addHtmlOutput(
                    `<span style="color:var(--green-primary)">${formatPrompt()}</span> ${escapeHtml(this.value)}`,
                    'cmd'
                );
                addOutput(completions.join('  '), 'info');
                scrollToBottom();
            } else if (completions.length === 1) {
                this.value += completions[0];
                updateGhost();
            }
        }

    } else if (e.key === 'ArrowRight') {
        if (getCurrentSuggestion() && this.selectionStart === this.value.length) {
            e.preventDefault();
            acceptSuggestion();
        }

    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = getHistoryIndex();
        if (idx > 0) {
            setHistoryIndex(idx - 1);
            this.value = commandHistory[idx - 1];
            updateGhost();
        }

    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = getHistoryIndex();
        if (idx < commandHistory.length - 1) {
            setHistoryIndex(idx + 1);
            this.value = commandHistory[idx + 1];
            updateGhost();
        } else {
            setHistoryIndex(commandHistory.length);
            this.value = '';
            clearSuggestion();
        }

    } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        commands.clear();

    } else if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        // Se um app estiver rodando, interrompe
        if (interruptApp()) {
            this.value = '';
            clearSuggestion();
            return;
        }
        // Senão, comportamento normal de cancelar linha atual
        addHtmlOutput(
            `<span style="color:var(--green-primary)">${formatPrompt()}</span> ${escapeHtml(this.value)}^C`,
            'cmd'
        );
        this.value = '';
        clearSuggestion();
        scrollToBottom();

    } else if (e.key === 'Escape') {
        if (isViewerOpen()) closeViewerPanel();
        interruptApp(); // Esc também interrompe apps
        clearSuggestion();
    }
});

terminalInput.addEventListener('input', updateGhost);

terminalScroll.addEventListener('click', (e) => {
    if (e.target.closest('[data-cmd]') || e.target.closest('a')) return;
    terminalInput.focus();
});

document.querySelectorAll('.nav-link[data-cmd], .logo[data-cmd]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        processCommand(link.getAttribute('data-cmd'));
        terminalInput.focus();
    });
});

// ---------------------
// Boot
// ---------------------

async function boot() {
    addOutput('Loading filesystem...', 'info');

    try {
        const res = await fetch('/fs/manifest.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFileSystem(await res.json());
    } catch {
        document.getElementById('terminal-output').lastChild.remove();
        addOutput('Error: Could not load filesystem manifest.', 'error');
        addOutput('Make sure the site is served via HTTP (podman compose up).', 'error');
        terminalInput.focus();
        return;
    }

    document.getElementById('terminal-output').lastChild.remove();
    //addOutput('Last login: Tue Oct 24 14:32:01 on ttys001', 'green');
    addOutput('');

    // Carregar .bashrc — aliases, comandos de inicialização, etc.
    await sourceBashrc();

    // Lidar com rotas SPA de URL direta (ex: /articles/post-name)
    const initialCmd = getInitialCommand();
    if (initialCmd) {
        await processCommand(initialCmd, false);
    } else {
        addOutput('');
    }

    scrollToBottom();
    terminalInput.focus();
}

boot();

