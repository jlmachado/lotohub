/**
 * @fileOverview Lógica do Jogo Fortune Tiger (Fiel ao Clone).
 */

const symbols = [
    'images/symbol_1.png', // Laranja
    'images/symbol_2.png', // Fogos
    'images/symbol_3.png', // Envelope
    'images/symbol_4.png', // Saco de Ouro
    'images/symbol_5.png', // Lingote
    'images/symbol_6.png', // Pote de Ouro
    'images/symbol_7.png'  // Tigre (Wild)
];

let currentBalance = 0;
let currentBet = 1.00;
let spinning = false;

// Sons
const sounds = {
    spin: new Audio('media/spin.mp3'),
    win: new Audio('media/win.mp3'),
    click: new Audio('media/click.mp3')
};

function init() {
    setupReels();
    
    document.getElementById('btn-spin').addEventListener('click', startSpin);
    document.getElementById('btn-plus').addEventListener('click', () => adjustBet(0.5));
    document.getElementById('btn-minus').addEventListener('click', () => adjustBet(-0.5));

    window.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_BALANCE') {
            currentBalance = event.data.balance;
            updateUI();
        }
    });

    // Notifica o Wrapper que o jogo carregou
    window.parent.postMessage({ type: 'GAME_READY' }, '*');
}

function setupReels() {
    for (let i = 1; i <= 3; i++) {
        const reel = document.getElementById(`reel-${i}`);
        reel.innerHTML = '';
        for (let j = 0; j < 15; j++) {
            const sym = document.createElement('div');
            sym.className = 'symbol';
            sym.style.backgroundImage = `url(${symbols[Math.floor(Math.random() * symbols.length)]})`;
            reel.appendChild(sym);
        }
    }
}

function adjustBet(amount) {
    sounds.click.play().catch(() => {});
    currentBet = Math.max(0.5, currentBet + amount);
    updateUI();
}

function updateUI() {
    document.getElementById('balance-value').innerText = `R$ ${currentBalance.toFixed(2)}`;
    document.getElementById('current-bet').innerText = `R$ ${currentBet.toFixed(2)}`;
}

async function startSpin() {
    if (spinning || currentBalance < currentBet) return;

    spinning = true;
    sounds.spin.play().catch(() => {});
    
    // Notifica débito
    window.parent.postMessage({ type: 'SLOT_BET', amount: currentBet }, '*');

    const reels = document.querySelectorAll('.reel');
    
    reels.forEach((reel, idx) => {
        reel.style.transition = `transform ${1 + idx * 0.5}s cubic-bezier(.41,-0.01,.57,1.01)`;
        reel.style.transform = `translateY(-70%)`;
    });

    setTimeout(() => {
        stopSpin();
    }, 2000);
}

function stopSpin() {
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => {
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(0)';
        setupReels(); // Novo sorteio visual
    });

    // Simulação de ganho (Heurística de Demonstração)
    if (Math.random() > 0.7) {
        const win = currentBet * (2 + Math.random() * 5);
        sounds.win.play().catch(() => {});
        document.getElementById('last-win-value').innerText = `R$ ${win.toFixed(2)}`;
        window.parent.postMessage({ type: 'SLOT_WIN', amount: win }, '*');
    }

    spinning = false;
}

window.onload = init;
