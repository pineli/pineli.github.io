// ===========================================
// Viewer — painel split-pane (lado direito)
// ===========================================

import {
    fsPathToUrl, isImageFile, isHtmlFile, isMarkdownFile,
    fetchFile
} from './filesystem.js';
import { parseMarkdown, parseFrontMatter } from './parsers.js';
import {
    escapeHtml, addOutput, addRichBlock, addPlainBlock, scrollToBottom
} from './terminal.js';
import { updateRoute } from './router.js';

// ---------------------
// Referências DOM
// ---------------------

const splitContainer = document.getElementById('split-container');
const viewerBody = document.getElementById('viewer-body');
const viewerTitle = document.getElementById('viewer-title');
const viewerClose = document.getElementById('viewer-close');

const DESKTOP_BREAKPOINT = 768;

// Callback para executar comandos de dentro do viewer
let processCommandCallback = null;

/** Define o callback que será chamado ao clicar em data-cmd no viewer */
export function setProcessCommandCallback(fn) {
    processCommandCallback = fn;
}

// ---------------------
// Controle do painel
// ---------------------

/** Verifica se a tela é grande o suficiente para o painel lateral */
export function isDesktop() {
    return window.innerWidth > DESKTOP_BREAKPOINT;
}

/** Abre o painel lateral com o título e conteúdo HTML */
export function openViewerPanel(title, content) {
    viewerTitle.textContent = title;
    viewerBody.innerHTML = '';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'rich-output';
    contentDiv.innerHTML = content;
    viewerBody.appendChild(contentDiv);

    // Tornar elementos data-cmd clicáveis dentro do viewer
    contentDiv.querySelectorAll('[data-cmd]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (processCommandCallback) {
                processCommandCallback(el.getAttribute('data-cmd'));
                scrollToBottom();
            }
        });
    });

    splitContainer.classList.add('viewer-open');
    viewerBody.scrollTop = 0;
}

/** Fecha o painel lateral */
export function closeViewerPanel() {
    splitContainer.classList.remove('viewer-open');
    viewerBody.innerHTML = '';
    updateRoute('/', null, null); // Reseta a URL e SEO
}

/** Retorna true se o painel está aberto */
export function isViewerOpen() {
    return splitContainer.classList.contains('viewer-open');
}

// Fechar ao clicar no botão [X]
viewerClose.addEventListener('click', closeViewerPanel);

// ---------------------
// Renderização de arquivo
// ---------------------

/**
 * Renderiza o conteúdo de um arquivo no terminal (inline) ou no viewer (panel).
 * Compartilhado entre os comandos `cat` e `open`.
 *
 * @param {string} filePath - caminho completo do arquivo
 * @param {object} node - nó do filesystem com metadados
 * @param {'inline'|'panel'} target - onde exibir
 * @param {Function} onCommand - callback para data-cmd
 */
export async function renderFileContent(filePath, node, target, onCommand) {
    const fileName = filePath.split('/').pop();

    // Imagens
    if (isImageFile(fileName)) {
        const url = fsPathToUrl(filePath);
        const caption = node.caption || fileName;
        
        let html;
        if (target === 'cover') {
            html = `<img src="${url}" alt="${escapeHtml(caption)}" class="image-viewer-img" loading="lazy" style="border-radius:10px; border: 1px solid var(--border-color); max-width: 500px; display: block; margin: 16px 0;">`;
        } else {
            html = `
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
        }

        if (target === 'panel') {
            openViewerPanel(fileName, html);
        } else {
            addRichBlock(html, onCommand);
        }
        return;
    }

    // Buscar conteúdo de texto
    const content = await fetchFile(filePath);
    if (content === null) {
        addOutput(`Error reading file: ${fileName}`, 'error');
        return;
    }

    // Renderizar conforme tipo
    let renderedHtml;
    if (isHtmlFile(fileName)) {
        renderedHtml = content;
    } else if (isMarkdownFile(fileName)) {
        const { body } = parseFrontMatter(content);
        renderedHtml = parseMarkdown(body, escapeHtml);
    } else {
        renderedHtml = `<pre><code>${escapeHtml(content)}</code></pre>`;
    }

    // Destino: Panel (Viewer) ou Inline (Terminal)
    if (target === 'panel') {
        openViewerPanel(fileName, renderedHtml);

        // SEO e Routing - Atualizar URL ao ler um artigo Markdown
        if (isMarkdownFile(fileName)) {
            // O parser já traz o front matter (YAML) caso exista
            const { meta, body } = parseFrontMatter(content);
            const routePath = `/articles/${fileName.replace('.md', '')}`;
            
            // Se houver um titulo no YAML, use, senão use o arquivo
            const pageTitle = meta.title || fileName.replace('.md', '');
            
            // Opcional: extrair uma sinopse do body para a description
            updateRoute(routePath, pageTitle, body);
        }

    } else {
        if (isHtmlFile(fileName) || isMarkdownFile(fileName)) {
            addRichBlock(renderedHtml, onCommand);
        } else {
            addPlainBlock(content);
        }
    }
}
