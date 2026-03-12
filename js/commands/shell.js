// ===========================================
// Comandos de shell — sh, bash, ssh
// ===========================================

import { addOutput } from '../terminal.js';

/** Callbacks injetados pelo index */
let executeScriptFn = null;

export function setDependencies({ executeScript }) {
    executeScriptFn = executeScript;
}

export default {
    async sh(args) {
        if (!args.length) { addOutput('sh: missing operand', 'error'); return; }
        await executeScriptFn(args[0]);
    },

    async bash(args) {
        if (!args.length) { addOutput('bash: missing operand', 'error'); return; }
        await executeScriptFn(args[0]);
    },

    ssh(args) {
        addOutput(`ssh: connect to host ${args[0] || 'unknown'}: Connection refused`, 'error');
    }
};
