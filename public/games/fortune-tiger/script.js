
/**
 * Fortune Tiger Engine - V2 (Definitive Assets Fix)
 * Baseado no clone: marvieiradev/fortune-tiger-clone
 */

const SYMBOLS = [
    { id: 'bull', img: 'images/bull.png', label: 'bolinho' },
    { id: 'orange', img: 'images/orange.png', label: 'laranja' },
    { id: 'firecracker', img: 'images/firecracker.png', label: 'fogos' },
    { id: 'red_envelope', img: 'images/red_envelope.png', label: 'envelope' },
    { id: 'gold_nugget', img: 'images/gold_nugget.png', label: 'ouro' },
    { id: 'jade', img: 'images/jade.png', label: 'jade' },
    { id: 'tiger', img: 'images/tiger.png', label: 'wild' }
];

const AUDIO = {
    spin: new Audio('media/spin.mp3'),
    win: new Audio('media/win.mp3'),
    click: new Audio('media/click.mp3'),
    bg: new Audio('media/background.mp3')
};

let currentBalance = 0;
let currentBet = 1.00;
let isSpinning = false;

// DOM Elements
const spinBtn = document.getElementById('spin-button');
const balanceDisplay = document.getElementById('balance-display');
const betDisplay = document.getElementById('bet-display');
const winDisplay = document.getElementById('win-display');
const loadingScreen = document.getElementById('loading-screen');
const winOverlay = document.getElementById('win-overlay');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    initReels();
    setupControls();
    
    // Comunique que o jogo carregou
    window.parent.postMessage({ type: 'GAME_READY' }, '*');
    
    // Remove loading após 1.5s
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 1500);
});

// Handle balance sync from NextJS
window.addEventListener('message', (event) => {
    if (event.data.type === 'SYNC_BALANCE') {
        currentBalance = event.data.balance;
        updateUI();
    }
});

function initReels() {
    for (let i = 1; i <= 3; i++) {
        const reel = document.getElementById(`reel${i}`);
        reel.innerHTML = '';
        for (let j = 0; j < 3; j++) {
            const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            reel.appendChild(createSymbolElement(sym.img, sym.label));
        }
    }
}

function createSymbolElement(src, alt) {
    const div = document.createElement('div');
    div.className = 'symbol';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    // Fallback para debug visual imediato
    img.onerror = () => {
        console.error(`Asset falhou: ${src}`);
        img.style.border = "1px solid red";
    };
    div.appendChild(img);
    return div;
}

function setupControls() {
    spinBtn.addEventListener('click', startSpin);
    
    document.getElementById('btn-plus').addEventListener('click', () => {
        currentBet = Math.min(100, currentBet + 1);
        betDisplay.innerText = `R$ ${currentBet.toFixed(2).replace('.', ',')}`;
        playSound('click');
    });

    document.getElementById('btn-minus').addEventListener('click', () => {
        currentBet = Math.max(1, currentBet - 1);
        betDisplay.innerText = `R$ ${currentBet.toFixed(2).replace('.', ',')}`;
        playSound('click');
    });
}

function startSpin() {
    if (isSpinning || currentBalance < currentBet) return;

    isSpinning = true;
    spinBtn.disabled = true;
    playSound('spin');
    
    // Notifica sistema sobre a aposta
    window.parent.postMessage({ type: 'SLOT_BET', amount: currentBet }, '*');

    // Inicia animação visual
    for (let i = 1; i <= 3; i++) {
        const reel = document.getElementById(`reel${i}`);
        reel.classList.add('spinning-animation');
    }

    // Resolve resultado após 2s
    setTimeout(stopSpin, 2000);
}

function stopSpin() {
    const results = [];
    for (let i = 1; i <= 3; i++) {
        const reel = document.getElementById(`reel${i}`);
        reel.classList.remove('spinning-animation');
        reel.innerHTML = '';
        
        const reelResults = [];
        for (let j = 0; j < 3; j++) {
            const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            reel.appendChild(createSymbolElement(sym.img, sym.label));
            reelResults.push(sym.id);
        }
        results.push(reelResults);
    }

    checkWin(results);
    isSpinning = false;
    spinBtn.disabled = false;
}

function checkWin(results) {
    // Lógica simplificada: se a linha do meio for idêntica ou contiver Wild
    const middleRow = [results[0][1], results[1][1], results[2][1]];
    const first = middleRow[0];
    const isWin = middleRow.every(s => s === first || s === 'tiger');

    if (isWin) {
        const winAmount = currentBet * 5;
        showWin(winAmount);
        window.parent.postMessage({ type: 'SLOT_WIN', amount: winAmount }, '*');
    }
}

function showWin(amount) {
    playSound('win');
    winDisplay.innerText = `R$ ${amount.toFixed(2).replace('.', ',')}`;
    document.getElementById('win-amount-total').innerText = `R$ ${amount.toFixed(2).replace('.', ',')}`;
    winOverlay.classList.remove('hidden');
    
    setTimeout(() => {
        winOverlay.classList.add('hidden');
    }, 3000);
}

function updateUI() {
    balanceDisplay.innerText = `R$ ${currentBalance.toFixed(2).replace('.', ',')}`;
}

function playSound(key) {
    try {
        const sound = AUDIO[key];
        sound.currentTime = 0;
        sound.play().catch(e => console.warn("Autoplay bloqueado pelo browser"));
    } catch(e) {}
}
