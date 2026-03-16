
/**
 * @fileOverview Motor de Jogo Fortune Tiger V2 - Edição Resiliente
 * Foco: Estabilidade no Preload e Prevenção de Travamentos.
 */

// --- CONFIGURAÇÃO DE ASSETS ---
const ASSETS_PATH = {
    images: 'images/',
    media: 'media/'
};

const MANDATORY_IMAGES = [
    { id: 'tiger', file: 'tiger.png' },
    { id: 'bull', file: 'bull.png' },
    { id: 'orange', file: 'orange.png' },
    { id: 'firecracker', file: 'firecracker.png' },
    { id: 'red_envelope', file: 'red_envelope.png' },
    { id: 'gold_nugget', file: 'gold_nugget.png' },
    { id: 'jade', file: 'jade.png' },
    { id: 'bg', file: 'bg.png' },
    { id: 'logo', file: 'logo.png' }
];

const OPTIONAL_MEDIA = [
    { id: 'spin', file: 'spin.mp3' },
    { id: 'win', file: 'win.mp3' },
    { id: 'click', file: 'click.mp3' },
    { id: 'bg_music', file: 'background.mp3' }
];

// --- ESTADO GLOBAL ---
const gameData = {
    balance: 0,
    bet: 1.00,
    isSpinning: false,
    loadedAssets: new Map(),
    audioCtx: null
};

// --- MOTOR DE PRELOAD ---
class AssetLoader {
    constructor() {
        this.total = MANDATORY_IMAGES.length + OPTIONAL_MEDIA.length;
        this.loaded = 0;
        this.hasFinished = false;
    }

    updateProgress() {
        this.loaded++;
        const percent = Math.round((this.loaded / this.total) * 100);
        const loaderText = document.getElementById('loading-text');
        if (loaderText) {
            loaderText.innerText = `CARREGANDO ${percent}%...`;
        }
        console.log(`[AssetLoader] Progresso: ${percent}% (${this.loaded}/${this.total})`);
    }

    async loadAll() {
        console.log('[AssetLoader] Iniciando carregamento de recursos...');
        
        // Timeout de segurança: 10 segundos para não travar o usuário
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 10000)
        );

        const loadTask = async () => {
            // 1. Carregar Imagens Obrigatórias
            const imgPromises = MANDATORY_IMAGES.map(asset => this.loadImage(asset));
            
            // 2. Carregar Áudios Opcionais (não bloqueantes no erro)
            const audioPromises = OPTIONAL_MEDIA.map(asset => this.loadAudio(asset));

            await Promise.allSettled([...imgPromises, ...audioPromises]);
            console.log('[AssetLoader] Todas as promessas de assets foram resolvidas/rejeitadas.');
        };

        try {
            await Promise.race([loadTask(), timeoutPromise]);
        } catch (err) {
            console.warn('[AssetLoader] Inicialização forçada por timeout ou erro crítico:', err.message);
        } finally {
            this.finish();
        }
    }

    loadImage(asset) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                gameData.loadedAssets.set(asset.id, img);
                this.updateProgress();
                resolve();
            };
            img.onerror = () => {
                console.error(`[AssetLoader] Falha ao carregar imagem obrigatória: ${asset.file}`);
                // Fallback: criar um canvas vazio para não quebrar o motor de renderização
                const canvas = document.createElement('canvas');
                canvas.width = 100; canvas.height = 100;
                gameData.loadedAssets.set(asset.id, canvas);
                this.updateProgress();
                resolve();
            };
            img.src = ASSETS_PATH.images + asset.file;
        });
    }

    loadAudio(asset) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                gameData.loadedAssets.set(asset.id, audio);
                this.updateProgress();
                resolve();
            };
            audio.onerror = () => {
                console.warn(`[AssetLoader] Falha ao carregar áudio opcional: ${asset.file}`);
                this.updateProgress();
                resolve(); // Resolve para não travar o Promise.all
            };
            audio.src = ASSETS_PATH.media + asset.file;
            audio.load();
        });
    }

    finish() {
        if (this.hasFinished) return;
        this.hasFinished = true;
        
        console.log('[AssetLoader] Finalizando bootstrap...');
        const loader = document.getElementById('loader');
        const game = document.getElementById('game-container');
        
        if (loader) loader.style.display = 'none';
        if (game) game.style.opacity = '1';
        
        // Notifica o wrapper que o jogo está pronto
        window.parent.postMessage({ type: 'GAME_READY' }, '*');
        
        this.initGameLoop();
    }

    initGameLoop() {
        console.log('[FortuneTiger] Jogo iniciado com sucesso.');
        // Lógica de renderização inicial dos reels
        updateUI();
    }
}

// --- LÓGICA DE INTERFACE ---
function updateUI() {
    const balEl = document.getElementById('balance-value');
    if (balEl) balEl.innerText = gameData.balance.toFixed(2).replace('.', ',');
}

// --- COMUNICAÇÃO COM O SISTEMA ---
window.addEventListener('message', (event) => {
    if (event.data.type === 'SYNC_BALANCE') {
        gameData.balance = event.data.balance;
        updateUI();
    }
});

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const loader = new AssetLoader();
    loader.loadAll();
});
