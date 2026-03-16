/**
 * @fileOverview Engine Profissional de Slot - Fortune Tiger Clone.
 * Lida com animações, lógica de símbolos e comunicação com o wrapper.
 */

const SYMBOLS = [
    { id: 'wild', img: 'images/wild.png', value: 10 },
    { id: 'pote', img: 'images/pote-ouro.png', value: 5 },
    { id: 'ouro', img: 'images/ouro.png', value: 3 },
    { id: 'envelope', img: 'images/envelope.png', value: 2 },
    { id: 'bolinho', img: 'images/bolinho.png', value: 1.5 },
    { id: 'moedas', img: 'images/moedas.png', value: 1 },
];

let currentBalance = 0;
let currentBet = 1.00;
let spinning = false;

// Audio objects
const sounds = {
    spin: new Audio('media/roleta.mp3'),
    win: new Audio('media/ganho.mp3'),
    bg: new Audio('media/musica.mp3')
};

function init() {
    setupReels();
    window.addEventListener('message', (e) => {
        if (e.data.type === 'SYNC_BALANCE') {
            currentBalance = e.data.balance;
            updateUI();
        }
    });
    
    // Notifica wrapper que o jogo está pronto
    window.parent.postMessage({ type: 'GAME_READY' }, '*');
    
    document.getElementById('spin-button').addEventListener('click', spin);
}

function setupReels() {
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => {
        for(let i=0; i<15; i++) {
            const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const div = document.createElement('div');
            div.className = 'symbol';
            div.innerHTML = `<img src="${sym.img}" alt="${sym.id}">`;
            reel.appendChild(div);
        }
    });
}

function updateUI() {
    document.getElementById('display-balance').innerText = `R$ ${currentBalance.toFixed(2).replace('.', ',')}`;
    document.getElementById('display-bet').innerText = `R$ ${currentBet.toFixed(2).replace('.', ',')}`;
}

function adjustBet(delta) {
    if (spinning) return;
    currentBet = Math.max(1.00, currentBet + delta);
    updateUI();
}

async function spin() {
    if (spinning || currentBalance < currentBet) return;
    
    spinning = true;
    currentBalance -= currentBet;
    updateUI();
    
    sounds.spin.currentTime = 0;
    sounds.spin.play().catch(() => {});

    const reels = document.querySelectorAll('.reel');
    const results = [];

    // Animação de giro
    for (let i = 0; i < reels.length; i++) {
        const reel = reels[i];
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(0)';
        
        // Simula o deslocamento
        setTimeout(() => {
            reel.style.transition = `transform ${1.5 + (i * 0.5)}s cubic-bezier(0.45, 0.05, 0.55, 0.95)`;
            reel.style.transform = 'translateY(-70%)';
        }, 50);
    }

    // Aguarda final do giro
    setTimeout(() => {
        checkWin();
        spinning = false;
    }, 3000);
}

function checkWin() {
    // Lógica simplificada de vitória baseada em probabilidade (RTP simulado)
    const winChance = Math.random();
    if (winChance > 0.7) {
        const multiplier = (Math.random() * 5) + 2;
        const prize = currentBet * multiplier;
        showWin(prize);
    }
}

function showWin(amount) {
    const overlay = document.getElementById('win-overlay');
    const winAmount = document.getElementById('win-amount');
    
    winAmount.innerText = `R$ ${amount.toFixed(2).replace('.', ',')}`;
    overlay.classList.remove('hidden');
    
    sounds.win.play().catch(() => {});
    
    // Notifica wrapper do prêmio
    window.parent.postMessage({ type: 'SLOT_WIN', amount }, '*');

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 3000);
}

window.onload = init;
