// ============================
// Interactive Terminal Simulator
// Loads real files from fs/ via fetch
// Split-pane viewer for `open` on desktop
// ============================

(function () {
  'use strict';

  const terminalInput = document.getElementById('terminal-input');
  const terminalOutput = document.getElementById('terminal-output');
  const terminalScroll = document.getElementById('terminal-scroll');
  const promptDisplay = document.getElementById('prompt-display');
  const splitContainer = document.getElementById('split-container');
  const viewerPanel = document.getElementById('viewer-panel');
  const viewerBody = document.getElementById('viewer-body');
  const viewerTitle = document.getElementById('viewer-title');
  const viewerClose = document.getElementById('viewer-close');

  // ---- State ----
  let fileSystem = {};
  let currentPath = '~';
  const commandHistory = [];
  let historyIndex = -1;

  // ---- Autocomplete ghost ----
  const ghostEl = document.createElement('span');
  ghostEl.className = 'autocomplete-ghost';
  ghostEl.setAttribute('aria-hidden', 'true');
  terminalInput.parentElement.appendChild(ghostEl);
  let currentSuggestion = '';

  // ==========================
  // VIEWER PANEL
  // ==========================
  const DESKTOP_BREAKPOINT = 768;

  function isDesktop() {
    return window.innerWidth > DESKTOP_BREAKPOINT;
  }

  function openViewerPanel(title, content) {
    viewerTitle.textContent = title;
    viewerBody.innerHTML = '';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'rich-output';
    contentDiv.innerHTML = content;
    viewerBody.appendChild(contentDiv);

    // Bind interactive elements inside viewer
    contentDiv.querySelectorAll('[data-cmd]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        processCommand(el.getAttribute('data-cmd'));
        scrollToBottom();
      });
    });

    splitContainer.classList.add('viewer-open');
    viewerBody.scrollTop = 0;
    terminalInput.focus();
  }

  function closeViewerPanel() {
    splitContainer.classList.remove('viewer-open');
    viewerBody.innerHTML = '';
    terminalInput.focus();
  }

  viewerClose.addEventListener('click', closeViewerPanel);

  // ==========================
  // MARKDOWN PARSER
  // ==========================
  function parseMarkdown(md) {
    let html = md;
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^---$/gm, '<hr>');
    const lines = html.split('\n');
    const result = [];
    let inPre = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('<pre>')) inPre = true;
      if (line.includes('</pre>')) { inPre = false; result.push(line); continue; }
      if (inPre) { result.push(line); continue; }
      const trimmed = line.trim();
      if (!trimmed) { result.push(''); continue; }
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|div|table)/.test(trimmed)) { result.push(line); }
      else { result.push(`<p>${line}</p>`); }
    }
    return result.join('\n');
  }

  // ==========================
  // FRONT MATTER PARSER
  // ==========================
  function parseFrontMatter(text) {
    const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: text };
    const meta = {};
    match[1].split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        let val = line.substring(idx + 1).trim();
        // Remove surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        meta[key] = val;
      }
    });
    return { meta, body: match[2] };
  }

  // ==========================
  // HELPERS
  // ==========================
  function resolvePath(path) {
    if (path === '~' || path === '') return '~';
    let parts;
    if (path.startsWith('~/')) parts = ['~', ...path.slice(2).split('/').filter(Boolean)];
    else if (path.startsWith('/')) parts = ['~', ...path.slice(1).split('/').filter(Boolean)];
    else if (path.startsWith('./')) parts = [...currentPath.split('/'), ...path.slice(2).split('/').filter(Boolean)];
    else parts = [...currentPath.split('/'), ...path.split('/').filter(Boolean)];
    const resolved = [];
    for (const part of parts) {
      if (part === '..') { if (resolved.length > 1) resolved.pop(); }
      else if (part !== '.') resolved.push(part);
    }
    return resolved.join('/');
  }

  function getNode(path) {
    const parts = path.split('/').filter(Boolean);
    let node = fileSystem;
    for (const part of parts) {
      if (node && node[part]) node = node[part];
      else if (node && node.children && node.children[part]) node = node.children[part];
      else return null;
    }
    return node;
  }

  function fsPathToUrl(fsPath) {
    return 'fs/' + fsPath.replace(/^~\/?/, '');
  }

  function getExtension(filename) {
    const dot = filename.lastIndexOf('.');
    return dot >= 0 ? filename.substring(dot).toLowerCase() : '';
  }

  function isImageFile(f) { return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(getExtension(f)); }
  function isHtmlFile(f) { return getExtension(f) === '.html'; }
  function isMarkdownFile(f) { return getExtension(f) === '.md'; }
  function isExecutable(f) { return getExtension(f) === '.sh'; }

  function getPermissions(name, isDir) {
    if (isDir) return 'drwxr-xr-x';
    if (isExecutable(name)) return '-rwxr-xr--';
    return '-rw-r--r--';
  }

  function formatPrompt() { return `pineli@dev:${currentPath}$`; }

  function addOutput(text, className = 'result') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.textContent = text;
    terminalOutput.appendChild(line);
  }

  function addHtmlOutput(html, className = 'result') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.innerHTML = html;
    terminalOutput.appendChild(line);
  }

  function addRichBlock(html) {
    const container = document.createElement('div');
    container.className = 'rich-output';
    container.innerHTML = html;
    terminalOutput.appendChild(container);
    container.querySelectorAll('[data-cmd]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        processCommand(el.getAttribute('data-cmd'));
        scrollToBottom();
      });
    });
  }

  function addPlainBlock(text) {
    const pre = document.createElement('pre');
    pre.className = 'rich-output';
    const code = document.createElement('code');
    code.textContent = text;
    pre.appendChild(code);
    terminalOutput.appendChild(pre);
  }

  function scrollToBottom() {
    requestAnimationFrame(() => { terminalScroll.scrollTop = terminalScroll.scrollHeight; });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updatePrompt() { promptDisplay.innerHTML = `${formatPrompt()}&nbsp;`; }

  // ==========================
  // FETCH
  // ==========================
  async function fetchFile(fsPath) {
    const url = fsPathToUrl(fsPath);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch { return null; }
  }

  // ==========================
  // AUTOCOMPLETE
  // ==========================
  const commandNames = [
    'help', 'ls', 'cd', 'cat', 'pwd', 'whoami', 'date', 'echo',
    'clear', 'neofetch', 'skills', 'projects', 'contact', 'history',
    'tree', 'ssh', 'sh', 'bash', 'uname', 'uptime', 'open', 'view', 'close'
  ];

  function getChildNames(dirPath) {
    const node = getNode(dirPath);
    if (!node || node.type !== 'dir') return [];
    return Object.keys(node.children || {}).map(n => (node.children[n].type === 'dir') ? n + '/' : n);
  }

  function getCompletions(input) {
    const trimmed = input.trimStart();
    if (!trimmed) return [];
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1 && !trimmed.endsWith(' ')) {
      const partial = parts[0].toLowerCase();
      return commandNames.filter(c => c.startsWith(partial) && c !== partial);
    }
    const lastArg = parts[parts.length - 1];
    if (trimmed.endsWith(' ')) return getChildNames(currentPath);
    let dirPath, partial;
    const lastSlash = lastArg.lastIndexOf('/');
    if (lastSlash >= 0) { dirPath = resolvePath(lastArg.substring(0, lastSlash + 1)); partial = lastArg.substring(lastSlash + 1); }
    else { dirPath = currentPath; partial = lastArg; }
    if (partial.startsWith('-')) return [];
    return getChildNames(dirPath).filter(n => n.toLowerCase().startsWith(partial.toLowerCase()) && n !== partial);
  }

  function getBestCompletion(input) {
    const completions = getCompletions(input);
    if (!completions.length) return '';
    const trimmed = input.trimStart();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1 && !trimmed.endsWith(' ')) return completions[0].substring(parts[0].length);
    if (trimmed.endsWith(' ')) return completions[0];
    const lastArg = parts[parts.length - 1];
    const lastSlash = lastArg.lastIndexOf('/');
    const partial = lastSlash >= 0 ? lastArg.substring(lastSlash + 1) : lastArg;
    if (partial.startsWith('-')) return '';
    return completions[0].substring(partial.length);
  }

  function updateGhost() {
    const val = terminalInput.value;
    if (!val) { ghostEl.textContent = ''; currentSuggestion = ''; return; }
    const suggestion = getBestCompletion(val);
    currentSuggestion = suggestion;
    ghostEl.textContent = suggestion;
    const measure = document.createElement('span');
    measure.style.cssText = 'font-family:var(--font-mono);font-size:0.85rem;visibility:hidden;position:absolute;white-space:pre;';
    measure.textContent = val;
    document.body.appendChild(measure);
    ghostEl.style.left = measure.offsetWidth + 'px';
    document.body.removeChild(measure);
  }

  function acceptSuggestion() {
    if (currentSuggestion) {
      terminalInput.value += currentSuggestion;
      currentSuggestion = '';
      ghostEl.textContent = '';
      updateGhost();
    }
  }

  // ==========================
  // RENDER FILE CONTENT (shared between cat + open)
  // ==========================
  async function renderFileContent(filePath, node, target) {
    // target: 'inline' (terminal) or 'panel' (viewer)
    const fileName = filePath.split('/').pop();

    if (isImageFile(fileName)) {
      const url = fsPathToUrl(filePath);
      const caption = node.caption || fileName;
      const html = `
        <div class="image-viewer">
          <div class="image-viewer-header">
            <span class="image-viewer-icon">🖼️</span>
            <span class="image-viewer-name">${escapeHtml(fileName)}</span>
            <span class="image-viewer-meta">${node.size || '?'} — ${node.date || '?'}</span>
          </div>
          <div class="image-viewer-frame">
            <img src="${url}" alt="${escapeHtml(caption)}" class="image-viewer-img" loading="lazy">
          </div>
          <p class="image-viewer-caption">${escapeHtml(caption)}</p>
        </div>`;
      if (target === 'panel') {
        openViewerPanel(fileName, html);
      } else {
        addRichBlock(html);
      }
      return;
    }

    // Fetch text content
    const content = await fetchFile(filePath);
    if (content === null) {
      addOutput(`Error reading file: ${fileName}`, 'error');
      return;
    }

    let renderedHtml;
    if (isHtmlFile(fileName)) {
      renderedHtml = content;
    } else if (isMarkdownFile(fileName)) {
      // Strip front matter before rendering
      const { body } = parseFrontMatter(content);
      renderedHtml = parseMarkdown(body);
    } else {
      // Plain text
      renderedHtml = `<pre><code>${escapeHtml(content)}</code></pre>`;
    }

    if (target === 'panel') {
      openViewerPanel(fileName, renderedHtml);
    } else {
      if (isHtmlFile(fileName) || isMarkdownFile(fileName)) {
        addRichBlock(renderedHtml);
      } else {
        addPlainBlock(content);
      }
    }
  }

  // ==========================
  // EXECUTE SHELL SCRIPT
  // ==========================
  async function executeScript(scriptName) {
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
      // Skip empty lines, comments, and shebang
      if (!line || line.startsWith('#')) continue;

      // Parse the command from the script line
      try {
        await processCommand(line, false);
      } catch (err) {
        addOutput(`bash: error executing: ${line}`, 'error');
      }
      scrollToBottom();

      // Wait for DOM render + small delay for visual effect
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 120));
    }
  }

  // ==========================
  // COMMANDS
  // ==========================
  const commands = {
    help() {
      addRichBlock(`
        <h3>Available Commands</h3>
        <table>
          <tr><th>Command</th><th>Description</th></tr>
          <tr><td style="color:var(--green-primary)">help</td><td>Show this help message</td></tr>
          <tr><td style="color:var(--green-primary)">ls [path]</td><td>List directory contents</td></tr>
          <tr><td style="color:var(--green-primary)">ls -la [path]</td><td>List with details</td></tr>
          <tr><td style="color:var(--green-primary)">cd &lt;path&gt;</td><td>Change directory</td></tr>
          <tr><td style="color:var(--green-primary)">cat &lt;file&gt;</td><td>Display file inline</td></tr>
          <tr><td style="color:var(--green-primary)">open &lt;file&gt;</td><td>Open file in side panel (desktop)</td></tr>
          <tr><td style="color:var(--green-primary)">close</td><td>Close the side panel</td></tr>
          <tr><td style="color:var(--green-primary)">sh &lt;script&gt;</td><td>Execute a shell script</td></tr>
          <tr><td style="color:var(--green-primary)">./&lt;script&gt;</td><td>Execute a shell script</td></tr>
          <tr><td style="color:var(--green-primary)">pwd</td><td>Print working directory</td></tr>
          <tr><td style="color:var(--green-primary)">whoami</td><td>Display current user</td></tr>
          <tr><td style="color:var(--green-primary)">date</td><td>Display current date/time</td></tr>
          <tr><td style="color:var(--green-primary)">echo &lt;text&gt;</td><td>Print text</td></tr>
          <tr><td style="color:var(--green-primary)">clear</td><td>Clear terminal</td></tr>
          <tr><td style="color:var(--green-primary)">neofetch</td><td>System information</td></tr>
          <tr><td style="color:var(--green-primary)">skills</td><td>Technical skills</td></tr>
          <tr><td style="color:var(--green-primary)">projects</td><td>Portfolio projects</td></tr>
          <tr><td style="color:var(--green-primary)">contact</td><td>Contact info</td></tr>
          <tr><td style="color:var(--green-primary)">history</td><td>Command history</td></tr>
          <tr><td style="color:var(--green-primary)">tree [path]</td><td>Directory tree</td></tr>
        </table>`);
    },

    async ls(args) {
      const detailed = args.includes('-la') || args.includes('-l') || args.includes('-al');
      let targetPath = currentPath;
      const pathArg = args.filter(a => !a.startsWith('-'))[0];
      if (pathArg) targetPath = resolvePath(pathArg);
      const node = getNode(targetPath);
      if (!node || node.type !== 'dir') {
        if (node && node.type === 'file') { addOutput(targetPath.split('/').pop()); return; }
        addOutput(`ls: cannot access '${pathArg || targetPath}': No such file or directory`, 'error');
        return;
      }
      const children = node.children || {};
      const entries = Object.keys(children).sort((a, b) => {
        if (children[a].type === 'dir' && children[b].type !== 'dir') return -1;
        if (children[a].type !== 'dir' && children[b].type === 'dir') return 1;
        return a.localeCompare(b);
      });
      if (!entries.length) { addOutput('(empty directory)', 'info'); return; }

      const dirName = targetPath.split('/').pop();

      // Articles — ls -la format with metadata from front matter
      if (dirName === 'articles') {
        addOutput(`total ${entries.length}`, 'info');
        // Fetch front matter for each article in parallel
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
          const cmdPath = (targetPath === currentPath) ? name : (pathArg ? pathArg + '/' + name : name);
          const line = document.createElement('div');
          line.className = 'output-line result';
          line.style.cursor = 'pointer';
          line.setAttribute('data-cmd', `open ${cmdPath}`);
          line.innerHTML = `${perms}  1 pineli www-data  ${size.padStart(5)}  ${date}  ${escapeHtml(displayName)}  <strong style="color:var(--green-primary)">[${escapeHtml(title)}]</strong>`;
          line.addEventListener('mouseenter', () => { line.style.color = 'var(--green-primary)'; });
          line.addEventListener('mouseleave', () => { line.style.color = ''; });
          line.addEventListener('click', (e) => {
            e.preventDefault();
            processCommand(`open ${cmdPath}`);
            scrollToBottom();
          });
          terminalOutput.appendChild(line);
        });
        return;
      }

      // Photos — grid
      if (dirName === 'photos') {
        let html = '<div class="photo-grid">';
        entries.forEach(name => {
          const child = children[name];
          const icons = { '.jpg': '📸', '.jpeg': '📸', '.png': '🖼️', '.gif': '🎞️' };
          const icon = icons[getExtension(name)] || '📄';
          const cmdPath = (targetPath === currentPath) ? name : (pathArg ? pathArg + '/' + name : name);
          html += `<div class="photo-card" data-cmd="open ${cmdPath}">
            <div class="photo-icon">${icon}</div>
            <div class="photo-name">${escapeHtml(name)}</div>
            <div class="photo-meta">${child.size || '?'} — ${child.date || '?'}</div>
          </div>`;
        });
        html += '</div>';
        html += `<p style="font-size:0.78rem;color:var(--text-dim);margin-top:12px">Click a photo or type <code style="color:var(--green-primary)">open photos/&lt;filename&gt;</code></p>`;
        addRichBlock(html);
        return;
      }

      // Default ls
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
      if (target === '~' || target === '') { currentPath = '~'; updatePrompt(); return; }
      const newPath = resolvePath(target);
      const node = getNode(newPath);
      if (!node) { addOutput(`cd: no such file or directory: ${target}`, 'error'); return; }
      if (node.type !== 'dir') { addOutput(`cd: not a directory: ${target}`, 'error'); return; }
      currentPath = newPath;
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
      await renderFileContent(filePath, node, 'inline');
    },

    async open(args) {
      if (!args.length) { addOutput('open: missing operand — usage: open <file>', 'error'); return; }
      const filePath = resolvePath(args[0]);
      const node = getNode(filePath);
      if (!node) { addOutput(`open: ${args[0]}: No such file or directory`, 'error'); return; }
      if (node.type === 'dir') { commands.ls(args); return; }

      // On desktop: open in side panel. On mobile: render inline.
      const target = isDesktop() ? 'panel' : 'inline';
      addOutput(`Opening ${args[0]}...`, 'green');
      await renderFileContent(filePath, node, target);
    },

    async view(args) { await commands.open(args); },

    close() {
      if (splitContainer.classList.contains('viewer-open')) {
        closeViewerPanel();
        addOutput('Panel closed.', 'info');
      } else {
        addOutput('No panel is open.', 'info');
      }
    },

    pwd() { addOutput(currentPath.replace('~', '/home/pineli')); },
    whoami() { addOutput('pineli'); },
    date() { addOutput(new Date().toString()); },
    echo(args) { addOutput(args.join(' ')); },
    clear() { terminalOutput.innerHTML = ''; },

    neofetch() {
      addRichBlock(`<pre><code>        .--.          pineli@dev
       |o_o |         ─────────────
       |:_/ |         OS: macOS Sonoma
      //   \\ \\        Host: MacBook Pro M2
     (|     | )       Shell: zsh 5.9
    /'\\_   _/\`\\       Terminal: iTerm2
    \\___)=(___/       Editor: Neovim</code></pre>`);
    },

    skills() {
      addRichBlock(`
        <h3>⚡ Technical Skills</h3>
        <table>
          <tr><th>Category</th><th>Technologies</th></tr>
          <tr><td>Frontend</td><td>React, TypeScript, Next.js, Vue.js, CSS/Sass</td></tr>
          <tr><td>Backend</td><td>Node.js, Rust, Go, Python, GraphQL</td></tr>
          <tr><td>DevOps</td><td>Docker, Kubernetes, AWS, CI/CD, Terraform</td></tr>
          <tr><td>Tools</td><td>Git, Neovim, tmux, Linux, Figma</td></tr>
        </table>`);
    },

    projects() {
      addRichBlock(`
        <h3>📦 Portfolio Projects</h3>
        <table>
          <tr><th>Project</th><th>Stack</th><th>Description</th></tr>
          <tr><td style="color:var(--green-primary)">micro-frontend-toolkit</td><td>React, TS</td><td>Micro-frontend architecture toolkit</td></tr>
          <tr><td style="color:var(--green-primary)">design-system-core</td><td>Web Components</td><td>Framework-agnostic design system</td></tr>
          <tr><td style="color:var(--green-primary)">api-gateway-rs</td><td>Rust, Actix</td><td>High-performance API gateway</td></tr>
          <tr><td style="color:var(--green-primary)">devops-pipeline</td><td>Docker, K8s</td><td>Automated CI/CD pipelines</td></tr>
        </table>`);
    },

    contact() {
      addRichBlock(`
        <h3>📬 Contact Information</h3>
        <div class="info-grid">
          <span class="info-label">Email</span><span class="info-value">contact@pineli.dev</span>
          <span class="info-label">GitHub</span><span class="info-value">github.com/pineli</span>
          <span class="info-label">LinkedIn</span><span class="info-value">linkedin.com/in/pineli</span>
          <span class="info-label">Twitter</span><span class="info-value">@pineli_dev</span>
        </div>`);
    },

    history() {
      commandHistory.forEach((cmd, i) => {
        addOutput(`  ${(i + 1).toString().padStart(4)}  ${cmd}`, 'info');
      });
    },

    tree(args) {
      const targetPath = args[0] ? resolvePath(args[0]) : currentPath;
      const node = getNode(targetPath);
      if (!node || node.type !== 'dir') { addOutput(`tree: not a directory`, 'error'); return; }
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
    },

    ssh(args) {
      if (args[0] && args[0].includes('contact')) {
        addOutput('Connecting to contact@pineli.dev...', 'green');
        commands.contact();
      } else {
        addOutput(`ssh: connect to host ${args[0] || 'unknown'}: Connection refused`, 'error');
      }
    },

    async sh(args) {
      if (!args.length) { addOutput('sh: missing operand', 'error'); return; }
      await executeScript(args[0]);
    },

    async bash(args) {
      if (!args.length) { addOutput('bash: missing operand', 'error'); return; }
      await executeScript(args[0]);
    },

    uname(args) { addOutput(args && args.includes('-a') ? 'Darwin dev.local 23.1.0 arm64' : 'Darwin'); },
    uptime() { addOutput(' 17:33  up 42 days,  3:17, 2 users, load averages: 1.23 1.45 1.67'); }
  };

  // ==========================
  // SHELL ARGUMENT PARSER
  // ==========================
  function parseShellArgs(input) {
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

  // ==========================
  // PROCESS COMMAND
  // ==========================
  async function processCommand(input, showPrompt = true) {
    const trimmed = input.trim();
    if (showPrompt) {
      addHtmlOutput(`<span style="color:var(--green-primary)">${formatPrompt()}</span> ${escapeHtml(trimmed)}`, 'cmd');
    }
    if (!trimmed) { scrollToBottom(); return; }
    if (showPrompt) {
      commandHistory.push(trimmed);
      historyIndex = commandHistory.length;
    }
    const parts = parseShellArgs(trimmed);
    const cmdName = parts[0];
    const args = parts.slice(1);

    // Handle ./script.sh syntax
    if (cmdName.startsWith('./') && cmdName.endsWith('.sh')) {
      const scriptName = cmdName.substring(2);
      await executeScript(scriptName);
      scrollToBottom();
      return;
    }

    if (commands[cmdName]) { await commands[cmdName](args); }
    else { addOutput(`bash: ${cmdName}: command not found. Type 'help' for available commands.`, 'error'); }
    scrollToBottom();
  }

  // ==========================
  // EVENTS
  // ==========================
  terminalInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      processCommand(this.value); this.value = ''; ghostEl.textContent = ''; currentSuggestion = '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (currentSuggestion) { acceptSuggestion(); }
      else {
        const completions = getCompletions(this.value);
        if (completions.length > 1) {
          addHtmlOutput(`<span style="color:var(--green-primary)">${formatPrompt()}</span> ${escapeHtml(this.value)}`, 'cmd');
          addOutput(completions.join('  '), 'info');
          scrollToBottom();
        } else if (completions.length === 1) { this.value += completions[0]; updateGhost(); }
      }
    } else if (e.key === 'ArrowRight') {
      if (currentSuggestion && this.selectionStart === this.value.length) { e.preventDefault(); acceptSuggestion(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) { historyIndex--; this.value = commandHistory[historyIndex]; updateGhost(); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) { historyIndex++; this.value = commandHistory[historyIndex]; updateGhost(); }
      else { historyIndex = commandHistory.length; this.value = ''; ghostEl.textContent = ''; currentSuggestion = ''; }
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); commands.clear(); }
    else if (e.key === 'Escape') {
      // Close viewer panel on Escape
      if (splitContainer.classList.contains('viewer-open')) { closeViewerPanel(); }
      ghostEl.textContent = ''; currentSuggestion = '';
    }
  });

  terminalInput.addEventListener('input', updateGhost);

  terminalScroll.addEventListener('click', (e) => {
    if (e.target.closest('[data-cmd]') || e.target.closest('a')) return;
    terminalInput.focus();
  });

  document.querySelectorAll('.nav-link[data-cmd]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      processCommand(link.getAttribute('data-cmd'));
      terminalInput.focus();
    });
  });

  // ==========================
  // BOOT
  // ==========================
  async function boot() {
    addOutput('Loading filesystem...', 'info');
    try {
      const res = await fetch('fs/manifest.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fileSystem = await res.json();
    } catch {
      terminalOutput.lastChild.remove();
      addOutput('Error: Could not load filesystem manifest.', 'error');
      addOutput('Make sure the site is served via HTTP (podman compose up).', 'error');
      terminalInput.focus();
      return;
    }
    terminalOutput.lastChild.remove();
    addOutput('Last login: Tue Oct 24 14:32:01 on ttys001', 'green');
    addOutput('');

    addHtmlOutput(`<span style="color:var(--green-primary)">${formatPrompt()}</span> cat welcome.html`, 'cmd');
    const welcome = await fetchFile('~/welcome.html');
    if (welcome) addRichBlock(welcome);
    addOutput('');

    addHtmlOutput(`<span style="color:var(--green-primary)">${formatPrompt()}</span> ls -la ./articles`, 'cmd');
    commands.ls(['-la', './articles']);
    addOutput('');
    scrollToBottom();
    terminalInput.focus();
  }

  boot();
})();
