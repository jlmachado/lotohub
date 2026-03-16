/**
 * Fortune Tiger - Engine Profissional Sincronizada
 */

const SYMBOLS = [
    { id: 1, name: 'bull', image: 'images/bull.png', value: 10 },
    { id: 2, name: 'orange', image: 'images/orange.png', value: 5 },
    { id: 3, name: 'firecracker', image: 'images/firecracker.png', value: 3 },
    { id: 4, name: 'envelope', image: 'images/envelope.png', value: 2 },
    { id: 5, name: 'gold', image: 'images/gold.png', value: 50 },
    { id: 6, name: 'jade', image: 'images/jade.png', value: 15 },
    { id: 7, name: 'tiger', image: 'images/tiger.png', value: 100, isWild: true }
];

const ASSETS_TO_PRELOAD = [
    'images/bg.png',
    'images/reel_bg.png',
    'images/tiger.png',
    'images/spin_btn.png',
    'images/logo.png',
    ...SYMBOLS.map(s => s.image)
];

let balance = 0;
let currentBet = 1.00;
let isSpinning = false;

// DOM Elements
const elements = {
    loader: document.getElementById('loader'),
    gameContainer: document.getElementById('game-container'),
    balanceDisplay: document.getElementById('balance-display'),
    betDisplay: document.getElementById('bet-display'),
    winDisplay: document.getElementById('win-display'),
    spinBtn: document.getElementById('spin-btn'),
    reelsContainer: document.getElementById('reels-container'),
    plusBtn: document.getElementById('plus-btn'),
    minusBtn: document.getElementById('minus-btn')
};

/**
 * Motor de Preload Resiliente
 */
async function preloadAssets() {
    console.log('[FortuneTiger] Iniciando preload...');
    
    const loadAsset = (path) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => {
            console.warn(`[FortuneTiger] Falha ao carregar: ${path}`);
            resolve(false);
        };
        img.src = path;
    });

    // Timeout de segurança: 10 segundos
    const timeout = new Promise(resolve => setTimeout(() => resolve('timeout'), 10000));
    const loaders = Promise.all(ASSETS_TO_PRELOAD.map(loadAsset));

    await Promise.race([loaders, timeout]);
    console.log('[FortuneTiger] Preload finalizado.');
    startGame();
}

function startGame() {
    elements.loader.style.display = 'none';
    elements.gameContainer.style.opacity = '1';
    elements.gameContainer.classList.remove('hidden');
    initReels();
    updateUI();
}

function initReels() {
    elements.reelsContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        reel.id = `reel-${i}`;
        
        for (let j = 0; j < 3; j++) {
            reel.appendChild(createSymbolElement());
        }
        elements.reelsContainer.appendChild(reel);
    }
}

function createSymbolElement(symbol = null) {
    const s = symbol || SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const div = document.createElement('div');
    div.className = 'symbol';
    div.innerHTML = `<img src="${s.image}" alt="${s.name}">`;
    return div;
}

function updateUI() {
    elements.balanceDisplay.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;
    elements.betDisplay.textContent = `R$ ${currentBet.toFixed(2).replace('.', ',')}`;
}

/**
 * Lógica do Spin
 */
async function spin() {
    if (isSpinning || balance < currentBet) return;

    isSpinning = true;
    elements.spinBtn.disabled = true;
    elements.winDisplay.textContent = 'R$ 0,00';

    // Notifica o sistema pai para descontar saldo
    window.parent.postMessage({ type: 'SLOT_BET', amount: currentBet }, '*');

    // Animação visual de giro
    const reels = document.querySelectorAll('.reel');
    reels.forEach(r => r.classList.add('spinning'));

    await new Promise(res => setTimeout(res, 2000));

    // Gera resultado
    const results = [];
    reels.forEach((reel, i) => {
        reel.classList.remove('spinning');
        reel.innerHTML = '';
        const column = [];
        for (let j = 0; j < 3; j++) {
            const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            reel.appendChild(createSymbolElement(sym));
            column.push(sym);
        }
        results.push(column);
    });

    checkWin(results);
    isSpinning = false;
    elements.spinBtn.disabled = false;
}

function checkWin(results) {
    // Simulação simplificada de detecção de ganho para o protótipo
    const isWin = Math.random() > 0.7;
    if (isWin) {
        const multiplier = [2, 5, 10, 50][Math.floor(Math.random() * 4)];
        const winAmount = currentBet * multiplier;
        elements.winDisplay.textContent = `R$ ${winAmount.toFixed(2).replace('.', ',')}`;
        window.parent.postMessage({ type: 'SLOT_WIN', amount: winAmount }, '*');
    }
}

// Listeners
elements.spinBtn.addEventListener('click', spin);
elements.plusBtn.addEventListener('click', () => { currentBet += 1; updateUI(); });
elements.minusBtn.addEventListener('click', () => { currentBet = Math.max(1, currentBet - 1); updateUI(); });

// Comunicação com AppContext
window.addEventListener('message', (event) => {
    if (event.data.type === 'SYNC_BALANCE') {
        balance = event.data.balance;
        updateUI();
    }
});

// Bootstrap
window.addEventListener('DOMContentLoaded', preloadAssets);