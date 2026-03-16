/**
 * Fortune Tiger Engine - Reconstruída com base no Clone Oficial
 */

const CONFIG = {
    BASE_PATH: '/games/fortune-tiger/',
    SYMBOLS: [
        { id: 'bull', weight: 1 },
        { id: 'jade', weight: 2 },
        { id: 'red_envelope', weight: 3 },
        { id: 'firecracker', weight: 4 },
        { id: 'orange', weight: 5 },
        { id: 'gold_nugget', weight: 6 },
        { id: 'tiger', weight: 0.1 } // Wild
    ],
    PRELOAD_IMAGES: [
        'images/bg.png',
        'images/reel_bg.png',
        'images/tiger.png',
        'images/logo.png',
        'images/spin_btn.png',
        'images/bull.png',
        'images/jade.png',
        'images/red_envelope.png',
        'images/firecracker.png',
        'images/orange.png',
        'images/gold_nugget.png'
    ],
    PRELOAD_MEDIA: [
        'media/spin.mp3',
        'media/win.mp3',
        'media/click.mp3',
        'media/background.mp3'
    ]
};

class GameEngine {
    constructor() {
        this.balance = 0;
        this.bet = 1.00;
        this.isSpinning = false;
        this.audioEnabled = false;
        this.audioContext = null;

        // Elementos DOM - Unificados com o HTML Oficial
        this.elements = {
            loader: document.getElementById('loader'),
            container: document.getElementById('game-container'),
            reels: document.getElementById('reels-container'),
            spinBtn: document.getElementById('spin-btn'),
            balance: document.getElementById('balance-display'),
            bet: document.getElementById('bet-display'),
            win: document.getElementById('win-display'),
            winOverlay: document.getElementById('win-overlay'),
            plusBtn: document.getElementById('plus-btn'),
            minusBtn: document.getElementById('minus-btn')
        };

        this.init();
    }

    async init() {
        console.log('[Fortune Tiger] Inicializando Engine...');
        try {
            await this.preloadAssets();
            this.setupListeners();
            this.renderInitialReels();
            this.hideLoader();
            this.listenToParentMessages();
            this.requestSync();
        } catch (error) {
            console.error('[Fortune Tiger] Falha crítica no bootstrap:', error);
            // Mesmo com erro, tentamos mostrar o jogo para não prender o usuário
            this.hideLoader();
        }
    }

    async preloadAssets() {
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout de carregamento')), 8000)
        );

        const assetPromises = [
            ...CONFIG.PRELOAD_IMAGES.map(src => this.loadImage(src)),
            ...CONFIG.PRELOAD_MEDIA.map(src => this.loadAudio(src))
        ];

        try {
            await Promise.race([
                Promise.allSettled(assetPromises),
                timeout
            ]);
            console.log('[Fortune Tiger] Preload concluído.');
        } catch (e) {
            console.warn('[Fortune Tiger] Preload incompleto, iniciando assim mesmo.');
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = () => {
                console.warn(`[Fortune Tiger] Falha na imagem: ${src}`);
                resolve(); // Non-blocking
            };
            img.src = src;
        });
    }

    loadAudio(src) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.oncanplaythrough = resolve;
            audio.onerror = () => {
                console.warn(`[Fortune Tiger] Falha no áudio: ${src}`);
                resolve(); // Non-blocking
            };
            audio.src = src;
        });
    }

    hideLoader() {
        if (this.elements.loader) {
            this.elements.loader.style.display = 'none';
        }
        if (this.elements.container) {
            this.elements.container.style.opacity = '1';
        }
    }

    setupListeners() {
        this.elements.spinBtn?.addEventListener('click', () => this.spin());
        this.elements.plusBtn?.addEventListener('click', () => this.updateBet(0.5));
        this.elements.minusBtn?.addEventListener('click', () => this.updateBet(-0.5));
        
        // Ativar áudio na primeira interação
        document.addEventListener('click', () => {
            if (!this.audioEnabled) {
                this.audioEnabled = true;
                this.playAudio('media/background.mp3', true);
            }
        }, { once: true });
    }

    renderInitialReels() {
        if (!this.elements.reels) return;
        this.elements.reels.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const col = document.createElement('div');
            col.className = 'reel-column';
            for (let j = 0; j < 3; j++) {
                col.appendChild(this.createSymbolElement(this.getRandomSymbol()));
            }
            this.elements.reels.appendChild(col);
        }
    }

    createSymbolElement(symbolId) {
        const div = document.createElement('div');
        div.className = 'symbol';
        const img = document.createElement('img');
        img.src = `images/${symbolId}.png`;
        img.alt = symbolId;
        div.appendChild(img);
        return div;
    }

    getRandomSymbol() {
        const pool = CONFIG.SYMBOLS;
        return pool[Math.floor(Math.random() * pool.length)].id;
    }

    updateBet(delta) {
        if (this.isSpinning) return;
        this.bet = Math.max(0.5, this.bet + delta);
        if (this.elements.bet) {
            this.elements.bet.innerText = `R$ ${this.bet.toFixed(2).replace('.', ',')}`;
        }
        this.playSound('media/click.mp3');
    }

    async spin() {
        if (this.isSpinning) return;
        
        // Envia intenção para o wrapper (NextJS)
        window.parent.postMessage({ type: 'SLOT_BET', amount: this.bet }, '*');

        this.isSpinning = true;
        this.elements.spinBtn.disabled = true;
        this.playSound('media/spin.mp3');

        // Animação visual de giro
        const columns = document.querySelectorAll('.reel-column');
        columns.forEach(col => col.classList.add('spinning'));

        // Simulação de resultado (será substituído por resposta do servidor no futuro)
        setTimeout(() => {
            this.stopSpin();
        }, 2000);
    }

    stopSpin() {
        const columns = document.querySelectorAll('.reel-column');
        columns.forEach(col => {
            col.classList.remove('spinning');
            col.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                col.appendChild(this.createSymbolElement(this.getRandomSymbol()));
            }
        });

        this.isSpinning = false;
        this.elements.spinBtn.disabled = false;

        // Lógica de vitória simulada (10% de chance)
        if (Math.random() > 0.9) {
            this.handleWin(this.bet * 5);
        }
    }

    handleWin(amount) {
        this.playSound('media/win.mp3');
        if (this.elements.win) {
            this.elements.win.innerText = `R$ ${amount.toFixed(2).replace('.', ',')}`;
        }
        
        if (this.elements.winOverlay) {
            document.getElementById('win-amount').innerText = `R$ ${amount.toFixed(2).replace('.', ',')}`;
            this.elements.winOverlay.classList.remove('hidden');
            setTimeout(() => {
                this.elements.winOverlay.classList.add('hidden');
            }, 3000);
        }

        window.parent.postMessage({ type: 'SLOT_WIN', amount }, '*');
    }

    playSound(src) {
        if (!this.audioEnabled) return;
        const sound = new Audio(src);
        sound.volume = 0.5;
        sound.play().catch(() => {});
    }

    playAudio(src, loop = false) {
        if (!this.audioEnabled) return;
        const audio = new Audio(src);
        audio.loop = loop;
        audio.volume = 0.3;
        audio.play().catch(() => {});
    }

    listenToParentMessages() {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'SYNC_BALANCE') {
                this.updateBalance(event.data.balance);
            }
        });
    }

    updateBalance(value) {
        this.balance = value;
        if (this.elements.balance) {
            this.elements.balance.innerText = `R$ ${this.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        }
    }

    requestSync() {
        window.parent.postMessage({ type: 'GAME_READY' }, '*');
    }
}

// Inicializar quando o DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameEngine();
});