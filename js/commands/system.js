// ===========================================
// Comandos de sistema — pwd, whoami, date, etc.
// ===========================================

import { getCurrentPath } from '../filesystem.js';
import { addOutput, getOutput } from '../terminal.js';

export default {
    pwd() {
        addOutput(getCurrentPath().replace('~', '/home/pineli'));
    },

    whoami() {
        addOutput('pineli');
    },

    date() {
        addOutput(new Date().toString());
    },

    echo(args) {
        addOutput(args.join(' '));
    },

    clear() {
        getOutput().innerHTML = '';
    },

    uname(args) {
        addOutput(args && args.includes('-a')
            ? 'Darwin dev.local 23.1.0 arm64'
            : 'Darwin'
        );
    },

    uptime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        addOutput(` ${hours}:${mins}  up 42 days,  3:17, 2 users, load averages: 1.23 1.45 1.67`);
    },

    reboot() {
        addOutput('Rebooting system...', 'info');
        setTimeout(() => {
            window.location.reload();
        }, 500); // pequeno delay para leitura
    }
};
