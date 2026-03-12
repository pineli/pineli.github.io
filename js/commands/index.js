// ===========================================
// Commands — registry central, processCommand, executeScript
// ===========================================

import {
    resolvePath, getNode, isExecutable, fetchFile
} from '../filesystem.js';
import { parseShellArgs } from '../parsers.js';
import {
    addOutput, addHtmlOutput, escapeHtml, formatPrompt,
    scrollToBottom, pushHistory, getCommandHistory
} from '../terminal.js';

// Sub-módulos de comandos
import systemCommands from './system.js';
import infoCommands, { setDependencies as setInfoDeps } from './info.js';
import filesystemCommands, { setDependencies as setFsDeps } from './filesystem.js';
import shellCommands, { setDependencies as setShellDeps } from './shell.js';
import appsCommands, { interruptApp } from './apps.js';

// ---------------------
// Registry de comandos
// ---------------------

const commands = {
    ...systemCommands,
    ...infoCommands,
    ...filesystemCommands,
    ...shellCommands,
    ...appsCommands
};

// ---------------------
// Controle de Interrupção
// ---------------------

export { interruptApp };

// ---------------------
// Aliases
// ---------------------

const aliases = {};

/** Retorna os aliases registrados */
export function getAliases() { return aliases; }

// ---------------------
// processCommand
// ---------------------

/**
 * Processa e executa um comando digitado no terminal.
 *
 * @param {string} input - texto digitado pelo usuário
 * @param {boolean} showPrompt - se true, exibe o prompt e adiciona ao histórico
 */
export async function processCommand(input, showPrompt = true) {
    const trimmed = input.trim();

    if (showPrompt) {
        addHtmlOutput(
            `<span style="color:var(--green-primary)">${formatPrompt()}</span> ${escapeHtml(trimmed)}`,
            'cmd'
        );
    }

    if (!trimmed) { scrollToBottom(); return; }

    if (showPrompt) {
        pushHistory(trimmed);
    }

    const parts = parseShellArgs(trimmed);
    const cmdName = parts[0];
    const args = parts.slice(1);

    // ── Comandos especiais do shell (alias, export, source) ──

    // alias ll="ls -la"
    if (cmdName === 'alias') {
        if (!args.length) {
            // Listar aliases
            Object.entries(aliases).forEach(([name, value]) => {
                addOutput(`alias ${name}='${value}'`, 'info');
            });
            return;
        }
        const expr = args.join(' ');
        const match = expr.match(/^(\w[\w-]*)=["']?(.+?)["']?$/);
        if (match) {
            aliases[match[1]] = match[2];
        } else {
            addOutput(`bash: alias: invalid format`, 'error');
        }
        scrollToBottom();
        return;
    }

    // export — aceitar silenciosamente (decorativo)
    if (cmdName === 'export') {
        scrollToBottom();
        return;
    }

    // source .bashrc / . .bashrc
    if (cmdName === 'source' || cmdName === '.') {
        if (args[0]) {
            await sourceFile(args[0]);
        } else {
            addOutput('bash: source: filename argument required', 'error');
        }
        scrollToBottom();
        return;
    }

    // ── Sintaxe ./script.sh ──
    if (cmdName.startsWith('./') && cmdName.endsWith('.sh')) {
        const scriptName = cmdName.substring(2);
        await executeScript(scriptName);
        scrollToBottom();
        return;
    }

    // ── Resolver alias ──
    if (aliases[cmdName]) {
        const expanded = aliases[cmdName] + (args.length ? ' ' + args.join(' ') : '');
        await processCommand(expanded, false);
        scrollToBottom();
        return;
    }

    // ── Executar comando registrado ──
    if (commands[cmdName]) {
        await commands[cmdName](args);
    } else {
        addOutput(`bash: ${cmdName}: command not found. Type 'help' for available commands.`, 'error');
    }

    scrollToBottom();
}

// ---------------------
// sourceFile
// ---------------------

/**
 * Carrega e executa um arquivo de configuração (como .bashrc).
 * Similar ao executeScript, mas aceita qualquer arquivo (não só .sh).
 * Não exibe prompt para cada linha. Sem delay visual.
 */
export async function sourceFile(fileName) {
    const filePath = resolvePath(fileName);
    const content = await fetchFile(filePath);
    if (content === null) {
        addOutput(`bash: ${fileName}: No such file or directory`, 'error');
        return;
    }

    const lines = content.split('\n');
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        try {
            await processCommand(line, false);
        } catch (err) {
            addOutput(`bash: source: error in ${fileName}: ${line}`, 'error');
        }
    }
}

/**
 * Carrega o .bashrc no boot.
 * Chamado pelo app.js durante a inicialização.
 */
export async function sourceBashrc() {
    await sourceFile('.bashrc');
}

// ---------------------
// executeScript
// ---------------------

/**
 * Busca um arquivo .sh e executa cada linha como comando do terminal.
 * Ignora linhas vazias, comentários (#) e shebang (#!/...).
 * Inclui delay entre comandos para efeito visual.
 */
export async function executeScript(scriptName) {
    const filePath = resolvePath(scriptName);
    const node = getNode(filePath);

    if (!node) {
        addOutput(`bash: ${scriptName}: No such file or directory`, 'error');
        return;
    }
    if (node.type === 'dir') {
        addOutput(`bash: ${scriptName}: Is a directory`, 'error');
        return;
    }
    if (!isExecutable(filePath.split('/').pop())) {
        addOutput(`bash: ${scriptName}: Permission denied`, 'error');
        return;
    }

    const content = await fetchFile(filePath);
    if (content === null) {
        addOutput(`bash: ${scriptName}: Error reading file`, 'error');
        return;
    }

    const lines = content.split('\n');
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        try {
            await processCommand(line, false);
        } catch (err) {
            addOutput(`bash: error executing: ${line}`, 'error');
        }

        scrollToBottom();
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => setTimeout(r, 120));
    }
}

// ---------------------
// Injeção de dependências
// ---------------------

setInfoDeps({
    processCommand,
    getHistory: getCommandHistory
});

setFsDeps({ processCommand });

setShellDeps({
    executeScript
});

// Exportar registry para uso externo
export { commands };
