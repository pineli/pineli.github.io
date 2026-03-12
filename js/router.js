// ===========================================
// Router — SPA Navigation & Dynamic SEO
// ===========================================

/**
 * Analisa a URL atual e retorna um comando inicial se for uma rota válida
 * Exemplo: /articles/hello-world => open articles/hello-world.md
 */
export function getInitialCommand() {
    const path = window.location.pathname;
    
    // Ignorar raiz
    if (!path || path === '/' || path === '/index.html') {
        return null;
    }

    // Rotas de artigos (/articles/...)
    if (path.startsWith('/articles/')) {
        const article = path.replace('/articles/', '').replace(/\/$/, '');
        if (article) {
            return `open articles/${article}.md`;
        }
    }

    // Adicione outras rotas aqui futuramente (ex: /photos/...)

    return null;
}

/**
 * Atualiza silenciosamente a URL do navegador e as tags de SEO (Title/Description)
 * 
 * @param {string} routePath - Caminho relativo da nova rota (ex: /articles/meu-post)
 * @param {string} title - O título da página para a aba do navegador
 * @param {string} description - A descrição para o SEO meta tag
 */
export function updateRoute(routePath, title, description) {
    // 1. Atualizar URL na barra de endereços (sem recarregar)
    if (window.location.pathname !== routePath) {
        window.history.pushState({ path: routePath }, '', routePath);
    }

    // 2. Atualizar Title
    const baseTitle = "[PINELI] - Senior Software Engineer";
    if (title) {
        document.title = `${title} | PINELI`;
    } else {
        document.title = baseTitle;
    }

    // 3. Atualizar Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        // Criar fallback se a tag não existir no HTML original
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
    }
    
    if (description) {
        // Limitar a descrição a ~150 chars para SEO
        const cleanDesc = description.replace(/<[^>]*>?/gm, '').trim();
        metaDesc.content = cleanDesc.length > 150 ? cleanDesc.substring(0, 147) + '...' : cleanDesc;
    } else {
        metaDesc.content = "Pineli - Senior Software Engineer building performant digital systems";
    }
}
