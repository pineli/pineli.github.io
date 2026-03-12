# Terminal Portfolio — pineli.dev

Portfolio interativo com interface de terminal Linux simulada no browser.

## Stack

- **HTML/CSS/JS** — vanilla, sem frameworks (Vanilla SPA Router & History API)
- **ES Modules** — código organizado em módulos nativos
- **Nginx Alpine** — servidor via Docker/Podman configurado para SPA Fallback
- **Markdown** — artigos renderizados inline com front matter YAML e injeção dinâmica de SEO
- **ASCGIF Engine** — engine nativa construída para renderizar blocos de animação ASCII frame-a-frame

## Estrutura do Projeto

```
pineli/
├── index.html              # Página principal (terminal + viewer)
├── style.css               # Estilos (tema dark, split-pane, rich output)
├── Dockerfile              # Imagem nginx:alpine
├── docker-compose.yml      # Orquestração com volume mounts
├── .dockerignore
│
├── js/                     # Código JavaScript (ES Modules)
│   ├── app.js              # Ponto de entrada, boot, event listeners
│   ├── router.js           # SPA Router (History API e Injeção de Meta SEO)
│   ├── terminal.js         # UI do terminal (output, prompt, autocomplete, live blocks)
│   ├── filesystem.js       # Estado e navegação do filesystem simulado
│   ├── parsers.js          # Parsers: markdown, front matter, ascgif, shell args
│   ├── viewer.js           # Painel split-pane integrado com rotas
│   └── commands/           # Comandos do terminal
│       ├── index.js        # Registry central + activeSession control
│       ├── filesystem.js   # ls, cd, cat, open, view, close, tree
│       ├── system.js       # pwd, whoami, date, echo, clear, uname, uptime, reboot
│       ├── apps.js         # Aplicativos com loop interno e controle de fps (ex: ascgif)
│       └── shell.js        # sh, bash, ssh
│
└── fs/                     # Filesystem simulado (servido via HTTP) e protegido por .htaccess
    ├── manifest.json       # Mapa da árvore de diretórios e metadados
    ├── welcome.html        # Conteúdo exibido no boot
    ├── about.html          # Página sobre
    ├── work.sh             # Script shell executável pelo terminal
    ├── .bashrc             # Arquivo de configuração simulado
    ├── .htaccess           # Anti-hotlink e bloqueio de folder indexing
    ├── animations/         # Matrizes de ASCII Animations (.ascgif)
    │   └── tux.ascgif
    ├── articles/           # Artigos em Markdown com front matter nativo e SEO dinâmico
    │   └── conferencia-iot-2021.md
    └── photos/             # Imagens do portfolio
```

## Como rodar

```bash
# Com Podman
podman compose up -d --build

# Com Docker
docker compose up -d --build
```

Acesse [http://localhost:3000](http://localhost:3000)

## Filesystem Simulado

O terminal não tem acesso ao sistema de arquivos real. Em vez disso:

1. **`fs/manifest.json`** descreve a árvore de diretórios (estrutura, tipo, tamanho, data)
2. Os arquivos reais ficam em **`fs/`** e são buscados via `fetch()` quando necessário
3. Comandos como `ls`, `cd`, `tree` navegam pelo manifest
4. Comandos como `cat`, `open` fazem `fetch()` para obter o conteúdo real

### Adicionar novos arquivos

1. Crie o arquivo em `fs/` (ex: `fs/articles/novo-artigo.md`)
2. Adicione a entrada correspondente no `fs/manifest.json`
3. Para artigos `.md`, adicione front matter no início:

```yaml
---
title: Título do Artigo
date: Mar 11
size: 5k
author: pineli
tags: tag1, tag2
---
```

## Arquitetura dos Módulos JS

```
app.js ──→ router.js       (Injeção de Metadados e History PushState)
       ──→ terminal.js     (UI, output, autocomplete, sessões live)
       ──→ filesystem.js   (estado, paths, rotas absolutas)
       ──→ viewer.js       (painel lateral e acionamento de rotas)
       ──→ commands/index.js
              ├── system.js      (comandos simples, reboot)
              ├── apps.js        (Renderizadores iterativos live - ASCGIF)
              ├── filesystem.js  (navegação de arquivos, rotas)
              └── shell.js       (execução de scripts)
```

- **`router.js`** — Interceptador de URLs diretas e dinâmico de SEO head tags
- **`parsers.js`** — funções puras para Markdown, YAML Front Matter e matrizes ASCGIF
- **`filesystem.js`** — gerencia estado global (currentPath, fileSystem e rotas estáticas absolutas)
- **`terminal.js`** — manipulação do DOM do terminal com sessões interceptáveis de block iterativo
- **`viewer.js`** — controle do painel split-pane (desktop only) conversando com o `router.js`
- **`commands/`** — agrupadores de comandos em objeto limpo, com suporte a interrupção processual (`activeSession`)

## Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `help` | Lista de comandos |
| `ls [-la] [path] [limit]` | Listar diretório, com opção de limite de itens retornado |
| `cd <path>` | Mudar diretório |
| `cat <file>` | Exibir arquivo de texto puro inline |
| `open [--cover] <file>` | Abrir arquivo renderizado (no painel, ou inline usando `--cover`) |
| `close` | Fechar painel lateral e resetar URL do navegador para raiz (`/`) |
| `sh <script>` | Executar script shell suportado |
| `./<script>` | Atalho para sh |
| `tree [path]` | Estrutura de diretórios aterradas no manifest |
| `pwd` | Diretório atual formatado |
| `whoami` | Usuário da sessão corrente |
| `echo <text>` | Printar param |
| `clear` | Limpar buffer da tela |
| `history` | Histórico das últimas entradas |
| `reboot` | Simula hot-reload reiniciando a página WebSPA |
| `ascgif <file.ascgif>` | Frame-player em ASCII com controle de FPS baseado em metadados customizados (`Ctrl+C` suspende) |

## Atalhos

| Tecla | Ação |
|-------|------|
| `Tab` | Autocomplete path/comando de acordo com manifest json |
| `↑` / `↓` | Navegar histórico e scroll nativo do output terminal |
| `Escape` | Fechar painel lateral, interromper loop app session (`ascgif`) |
| `Ctrl+C` | Abortar aplicativo rodando em foreground (como loops de fps em animadores) |
| `Ctrl+L` | Limpar terminal e rolar para base |
