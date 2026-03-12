// ===========================================
// Comandos de filesystem — ls, cd, cat, etc.
// ===========================================

import {
    getCurrentPath, setCurrentPath, resolvePath, getNode,
    getExtension, isImageFile, isMarkdownFile, isExecutable,
    getPermissions, fetchFile
} from '../filesystem.js';
import { parseFrontMatter } from '../parsers.js';
import {
    addOutput, addRichBlock, escapeHtml, updatePrompt, scrollToBottom, getOutput
} from '../terminal.js';
import { isDesktop, renderFileContent, closeViewerPanel, isViewerOpen } from '../viewer.js';

/** Callback para processCommand — injetado pelo index */
let processCommandFn = null;

export function setDependencies({ processCommand }) {
    processCommandFn = processCommand;
}

function onCommand(cmd) {
    if (processCommandFn) {
        processCommandFn(cmd);
        scrollToBottom();
    }
}

export default {
    async ls(args) {
        const detailed = args.includes('-la') || args.includes('-l') || args.includes('-al');
        
        // Parse arguments for limit and path
        let limit = null;
        let pathArg = null;
        const nonFlags = args.filter(a => !a.startsWith('-'));
        for (const arg of nonFlags) {
            if (/^\d+$/.test(arg)) {
                limit = parseInt(arg, 10);
            } else {
                pathArg = arg; // It's a path if it's not a purely numeric string
            }
        }

        let targetPath = getCurrentPath();
        if (pathArg) targetPath = resolvePath(pathArg);

        const node = getNode(targetPath);
        if (!node || node.type !== 'dir') {
            if (node && node.type === 'file') { addOutput(targetPath.split('/').pop()); return; }
            addOutput(`ls: cannot access '${pathArg || targetPath}': No such file or directory`, 'error');
            return;
        }

        const children = node.children || {};
        let entries = Object.keys(children).sort((a, b) => {
            if (children[a].type === 'dir' && children[b].type !== 'dir') return -1;
            if (children[a].type !== 'dir' && children[b].type === 'dir') return 1;
            return a.localeCompare(b);
        });

        if (limit !== null && limit > 0) {
            entries = entries.slice(0, limit);
        }

        if (!entries.length) { addOutput('(empty directory)', 'info'); return; }

        const dirName = targetPath.split('/').pop();
        const terminalOutput = getOutput();

        // ── Articles: ls -la com metadados do front matter ──
        if (dirName === 'articles') {
            addOutput(`total ${entries.length}`, 'info');

            const metaPromises = entries.map(async (name) => {
                const child = children[name];
                if (child.type === 'dir' || !isMarkdownFile(name)) return { name, meta: {} };
                const filePath = targetPath + '/' + name;
                const content = await fetchFile(filePath);
                if (!content) return { name, meta: {} };
                const { meta } = parseFrontMatter(content);
                return { name, meta };
            });

            const allMeta = await Promise.all(metaPromises);
            allMeta.forEach(({ name, meta }) => {
                const child = children[name];
                const isDir = child.type === 'dir';
                const perms = getPermissions(name, isDir);
                const size = meta.size || child.size || (isDir ? '4.0k' : '1.2k');
                const date = meta.date || child.date || 'Mar 11';
                const displayName = isDir ? name + '/' : name;
                const title = meta.title || name.replace(/\.(md|html|txt)$/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const cmdPath = (targetPath === getCurrentPath()) ? name : (pathArg ? pathArg + '/' + name : name);

                const line = document.createElement('div');
                line.className = 'output-line result';
                line.style.cursor = 'pointer';
                line.setAttribute('data-cmd', `open ${cmdPath}`);
                line.innerHTML = `${perms}  1 pineli www-data  ${size.padStart(5)}  ${date} <strong style="color:var(--green-primary)">[${escapeHtml(title)}]</strong> ${escapeHtml(displayName)}`;
                line.addEventListener('mouseenter', () => { line.style.color = 'var(--green-primary)'; });
                line.addEventListener('mouseleave', () => { line.style.color = ''; });
                line.addEventListener('click', (e) => { e.preventDefault(); onCommand(`open ${cmdPath}`); });
                terminalOutput.appendChild(line);
            });
            return;
        }



        // ── Default ls ──
        if (detailed) {
            addOutput(`total ${entries.length}`, 'info');
            entries.forEach(name => {
                const child = children[name];
                const isDir = child.type === 'dir';
                const perms = getPermissions(name, isDir);
                const size = child.size || (isDir ? '4.0k' : '1.2k');
                const date = child.date || 'Mar 11';
                const displayName = isDir ? name + '/' : name;
                addOutput(`${perms}  1 pineli www-data  ${size.padStart(5)}  ${date}  ${displayName}`, isDir ? 'green' : 'result');
            });
        } else {
            let line = '';
            entries.forEach(name => {
                line += ((children[name].type === 'dir' ? name + '/' : name).padEnd(24));
            });
            addOutput(line.trim());
        }
    },

    cd(args) {
        const target = args[0] || '~';
        if (target === '~' || target === '') { setCurrentPath('~'); updatePrompt(); return; }

        const newPath = resolvePath(target);
        const node = getNode(newPath);
        if (!node) { addOutput(`cd: no such file or directory: ${target}`, 'error'); return; }
        if (node.type !== 'dir') { addOutput(`cd: not a directory: ${target}`, 'error'); return; }

        setCurrentPath(newPath);
        updatePrompt();
    },

    async cat(args) {
        if (!args.length) { addOutput('cat: missing operand', 'error'); return; }

        const filePath = resolvePath(args[0]);
        const node = getNode(filePath);
        if (!node) { addOutput(`cat: ${args[0]}: No such file or directory`, 'error'); return; }
        if (node.type === 'dir') { addOutput(`cat: ${args[0]}: Is a directory`, 'error'); return; }

        const fileName = filePath.split('/').pop();
        if (isImageFile(fileName)) {
            addOutput(`cat: ${args[0]}: Binary file. Use 'open ${args[0]}' to view.`, 'info');
            return;
        }

        await renderFileContent(filePath, node, 'inline', onCommand);
    },

    async open(args) {
        let isCover = false;
        if (args.includes('--cover')) {
            isCover = true;
            args = args.filter(a => a !== '--cover');
        }

        if (!args.length) { addOutput('open: missing operand — usage: open [--cover] <file>', 'error'); return; }

        const filePath = resolvePath(args[0]);
        const node = getNode(filePath);
        if (!node) { addOutput(`open: ${args[0]}: No such file or directory`, 'error'); return; }
        if (node.type === 'dir') { this.ls(args); return; }

        let target = 'inline';
        if (isDesktop() && !isCover) {
            target = 'panel';
        } else if (isCover) {
            target = 'cover';
        }

        addOutput(`Opening ${args[0]}...`, 'green');
        await renderFileContent(filePath, node, target, onCommand);
    },

    async view(args) {
        await this.open(args);
    },

    close() {
        if (isViewerOpen()) {
            closeViewerPanel();
            addOutput('Panel closed.', 'info');
        } else {
            addOutput('No panel is open.', 'info');
        }
    },

    tree(args) {
        const targetPath = args[0] ? resolvePath(args[0]) : getCurrentPath();
        const node = getNode(targetPath);
        if (!node || node.type !== 'dir') { addOutput('tree: not a directory', 'error'); return; }

        addOutput(targetPath === '~' ? '~' : targetPath.split('/').pop(), 'green');

        function printTree(dirNode, prefix) {
            const entries = Object.keys(dirNode.children || {});
            entries.forEach((name, i) => {
                const last = i === entries.length - 1;
                const child = dirNode.children[name];
                const isDir = child.type === 'dir';
                addOutput(`${prefix}${last ? '└── ' : '├── '}${name}${isDir ? '/' : ''}`, isDir ? 'green' : 'result');
                if (isDir) printTree(child, prefix + (last ? '    ' : '│   '));
            });
        }

        printTree(node, '');
    }
};
