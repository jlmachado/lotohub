// Engine Fortune Tiger - V2 Unificada
const ASSETS = {
    images: [
        'bg.png', 'reel_bg.png', 'tiger.png', 'spin_btn.png', 'logo.png',
        'bull.png', 'jade.png', 'red_envelope.png', 'firecracker.png', 'orange.png', 'gold_nugget.png'
    ],
    audio: [
        'spin.mp3', 'win.mp3', 'click.mp3', 'background.mp3'
    ]
};

const SYMBOLS = [
    { id: 'tiger', image: 'images/tiger.png', value: 100 },
    { id: 'bull', image: 'images/bull.png', value: 50 },
    { id: 'jade', image: 'images/jade.png', value: 25 },
    { id: 'nugget', image: 'images/gold_nugget.png', value: 10 },
    { id: 'envelope', image: 'images/red_envelope.png', value: 5 },
    { id: 'firecracker', image: 'images/firecracker.png', value: 3 },
    { id: 'orange', image: 'images/orange.png', value: 2 }
];

let gameState = {
    isSpinning: false,
    balance: 0,
    bet: 1.00
};

// Seletores de DOM - Alinhados com index.html
const nodes = {
    loader: document.getElementById('loader'),
    gameContainer: document.getElementById('game-container'),
    reels: document.getElementById('reels-container'),
    spinBtn: document.getElementById('spin-btn'),
    balanceDisplay: document.getElementById('balance-display'),
    betDisplay: document.getElementById('bet-display')
};

async function init() {
    console.log('Iniciando Preload Fortune Tiger...');
    
    // Timeout de segurança de 10 segundos
    const preloadTimeout = setTimeout(finalizeLoading, 10000);

    try {
        await preloadAssets();
        clearTimeout(preloadTimeout);
        finalizeLoading();
    } catch (e) {
        console.warn('Alguns assets falharam, iniciando jogo mesmo assim...', e);
        finalizeLoading();
    }
}

function finalizeLoading() {
    if (nodes.loader) nodes.loader.style.opacity = '0';
    setTimeout(() => {
        if (nodes.loader) nodes.loader.classList.add('hidden');
        if (nodes.gameContainer) {
            nodes.gameContainer.classList.remove('hidden');
            nodes.gameContainer.style.opacity = '1';
        }
        setupGame();
    }, 500);
}

async function preloadAssets() {
    const promises = [
        ...ASSETS.images.map(src => loadFile(`images/${src}`, 'image')),
        ...ASSETS.audio.map(src => loadFile(`media/${src}`, 'audio'))
    ];
    return Promise.allSettled(promises);
}

function loadFile(path, type) {
    return new Promise((resolve, reject) => {
        const el = type === 'image' ? new Image() : new Audio();
        el.onload = () => resolve(path);
        el.oncanplaythrough = () => resolve(path);
        el.onerror = () => {
            console.error(`Falha ao carregar: ${path}`);
            resolve(path); // Resolve para não travar o Promise.all
        };
        el.src = path;
    });
}

function setupGame() {
    renderReels();
    
    // Listeners de controles
    nodes.spinBtn?.addEventListener('click', startSpin);
    
    // Listener para saldo vindo do NextJS
    window.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_BALANCE') {
            gameState.balance = event.data.balance;
            updateUI();
        }
    });

    // Notifica que o jogo está pronto
    window.parent.postMessage({ type: 'GAME_READY' }, '*');
}

function renderReels() {
    if (!nodes.reels) return;
    nodes.reels.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        for (let j = 0; j < 3; j++) {
            const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            reel.appendChild(createSymbolNode(sym));
        }
        nodes.reels.appendChild(reel);
    }
}

function createSymbolNode(sym) {
    const div = document.createElement('div');
    div.className = 'symbol';
    const img = document.createElement('img');
    img.src = sym.image;
    img.alt = sym.id;
    div.appendChild(img);
    return div;
}

function startSpin() {
    if (gameState.isSpinning) return;
    
    gameState.isSpinning = true;
    nodes.spinBtn?.classList.add('spinning');
    
    // Emitir evento de aposta para o sistema
    window.parent.postMessage({ type: 'SLOT_BET', amount: gameState.bet }, '*');

    // Simulação de animação
    let count = 0;
    const interval = setInterval(() => {
        renderReels();
        count++;
        if (count > 15) {
            clearInterval(interval);
            stopSpin();
        }
    }, 100);
}

function stopSpin() {
    gameState.isSpinning = false;
    nodes.spinBtn?.classList.remove('spinning');
    
    // Lógica simples de vitória (10% de chance)
    if (Math.random() > 0.9) {
        const winAmount = gameState.bet * 5;
        window.parent.postMessage({ type: 'SLOT_WIN', amount: winAmount }, '*');
    }
}

function updateUI() {
    if (nodes.balanceDisplay) {
        nodes.balanceDisplay.textContent = `R$ ${gameState.balance.toFixed(2).replace('.', ',')}`;
    }
    if (nodes.betDisplay) {
        nodes.betDisplay.textContent = `R$ ${gameState.bet.toFixed(2).replace('.', ',')}`;
    }
}

// Iniciar bootstrap
document.addEventListener('DOMContentLoaded', init);