// ===========================================
// Comandos informativos — help, neofetch, etc.
// ===========================================

import { addOutput, addRichBlock } from '../terminal.js';

/** Callback para processCommand — injetado pelo index */
let processCommandFn = null;
let getHistoryFn = null;

export function setDependencies({ processCommand, getHistory }) {
    processCommandFn = processCommand;
    getHistoryFn = getHistory;
}

function onCommand(cmd) {
    if (processCommandFn) processCommandFn(cmd);
}

export default {
    help() {
        addRichBlock(`
      <h3>Available Commands</h3>
      <table>
        <tr><th>Command</th><th>Description</th></tr>
        <tr><td style="color:var(--green-primary)">help</td><td>Show this help message</td></tr>
        <tr><td style="color:var(--green-primary)">ls [path] [limit]</td><td>List directory contents</td></tr>
        <tr><td style="color:var(--green-primary)">ls -la [path] [limit]</td><td>List with details</td></tr>
        <tr><td style="color:var(--green-primary)">cd &lt;path&gt;</td><td>Change directory</td></tr>
        <tr><td style="color:var(--green-primary)">cat &lt;file&gt;</td><td>Display file inline</td></tr>
        <tr><td style="color:var(--green-primary)">open &lt;file&gt;</td><td>Open file in side panel (desktop)</td></tr>
        <tr><td style="color:var(--green-primary)">close</td><td>Close the side panel</td></tr>
        <tr><td style="color:var(--green-primary)">sh &lt;script&gt;</td><td>Execute a shell script</td></tr>
        <tr><td style="color:var(--green-primary)">./ &lt;script&gt;</td><td>Execute a shell script</td></tr>
        <tr><td style="color:var(--green-primary)">ascgif &lt;file&gt;</td><td>Play ASCII animation</td></tr>
        <tr><td style="color:var(--green-primary)">pwd</td><td>Print working directory</td></tr>
        <tr><td style="color:var(--green-primary)">whoami</td><td>Display current user</td></tr>
        <tr><td style="color:var(--green-primary)">date</td><td>Display current date/time</td></tr>
        <tr><td style="color:var(--green-primary)">echo &lt;text&gt;</td><td>Print text</td></tr>
        <tr><td style="color:var(--green-primary)">clear</td><td>Clear terminal</td></tr>
        <tr><td style="color:var(--green-primary)">history</td><td>Command history</td></tr>
        <tr><td style="color:var(--green-primary)">tree [path]</td><td>Directory tree</td></tr>
        <tr><td style="color:var(--green-primary)">reboot</td><td>Restart terminal</td></tr>
      </table>`, onCommand);
    },

    history() {
        const history = getHistoryFn ? getHistoryFn() : [];
        history.forEach((cmd, i) => {
            addOutput(`  ${(i + 1).toString().padStart(4)}  ${cmd}`, 'info');
        });
    }
};
