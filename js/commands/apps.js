// ===========================================
// Aplicativos Interativos — ascGif, etc.
// ===========================================

import { 
    resolvePath, getNode, fetchFile, isExecutable 
} from '../filesystem.js';
import { parseAscGif } from '../parsers.js';
import { 
    addOutput, createLiveBlock, scrollToBottom, escapeHtml 
} from '../terminal.js';

// Estado global para permitir interrupções (Ctrl+C)
let activeApp = null;

/**
 * Informa ao módulo de apps que uma interrupção (Ctrl+C / Esc) foi solicitada.
 * Se algum app estiver rodando, ele será abortado.
 * Retorna true se um app foi interrompido.
 */
export function interruptApp() {
    if (activeApp && typeof activeApp.abort === 'function') {
        activeApp.abort();
        activeApp = null;
        return true;
    }
    return false;
}

export default {
    /**
     * ascgif: Executa animações ASCII a partir de arquivos .ascgif.
     * Suporta metadados (fps, loop) e frames separados por ===FRAME===.
     */
    async ascgif(args) {
        if (!args.length) {
            addOutput('ascgif: missing operand — usage: ascgif <file.ascgif>', 'error');
            return;
        }

        const filePath = resolvePath(args[0]);
        const node = getNode(filePath);

        if (!node) {
            addOutput(`ascgif: ${args[0]}: No such file or directory`, 'error');
            return;
        }
        if (node.type === 'dir') {
            addOutput(`ascgif: ${args[0]}: Is a directory`, 'error');
            return;
        }
        if (!filePath.endsWith('.ascgif')) {
            addOutput(`ascgif: ${args[0]}: Not an ascGif file`, 'error');
            return;
        }

        const content = await fetchFile(filePath);
        if (content === null) {
            addOutput(`ascgif: ${args[0]}: Error reading file`, 'error');
            return;
        }

        const anim = parseAscGif(content);
        if (!anim.frames || anim.frames.length === 0) {
            addOutput(`ascgif: ${args[0]}: No frames found`, 'error');
            return;
        }

        // Determina o tamanho da animação para fixar a "tela" e não deixar o container pulando
        let maxCols = 0;
        let maxRows = 0;
        anim.frames.forEach(frame => {
            const lines = frame.split('\n');
            if (lines.length > maxRows) maxRows = lines.length;
            lines.forEach(line => {
                if (line.length > maxCols) maxCols = line.length;
            });
        });

        const liveBlock = createLiveBlock('live-output ascgif-player', maxCols, maxRows);
        
        let aborted = false;
        let currentFrame = 0;
        let loopCount = 0;
        const MAX_LOOPS = 10;
        let intervalId = null;

        // Registra o app ativo para permitir interrupções (Ctrl+C / Esc)
        activeApp = {
            abort: () => {
                aborted = true;
                if (intervalId) clearInterval(intervalId);
                addOutput('^C', 'result'); // Feedback visual da interrupção
            }
        };

        const renderFrame = () => {
            if (aborted) return;
            
            // Renderiza o frame e previne injeção de HTML
            liveBlock.innerHTML = escapeHtml(anim.frames[currentFrame]);
            scrollToBottom();

            currentFrame++;
            
            if (currentFrame >= anim.frames.length) {
                if (anim.loop && loopCount < MAX_LOOPS - 1) {
                    currentFrame = 0;
                    loopCount++;
                } else {
                    clearInterval(intervalId);
                    activeApp = null;
                }
            }
        };

        // Renderiza o primeiro frame imediatamente 
        renderFrame();

        // Se houver mais de um frame, configura o loop FPS
        if (anim.frames.length > 1 && !aborted && (currentFrame < anim.frames.length || anim.loop)) {
            const msPerFrame = 1000 / anim.fps;
            
            return new Promise(resolve => {
                intervalId = setInterval(() => {
                    renderFrame();
                    if (!intervalId || activeApp === null) {
                        clearInterval(intervalId);
                        resolve();
                    }
                }, msPerFrame);
                
                // Sobrescreve abort para resolver a promessa e não prender the thread
                const originalAbort = activeApp.abort;
                activeApp.abort = () => {
                    originalAbort();
                    resolve();
                };
            });
        }
        
        activeApp = null;
    }
};
