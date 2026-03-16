/**
 * @fileOverview Motor de Slot Fortune Tiger - Versão Resiliente V2
 * Foco: Correção de Loading Infinito e Tratamento de Erros de Assets.
 */

const ASSETS = {
    images: {
        bg: 'images/bg.png',
        reel: 'images/reel_bg.png',
        tiger: 'images/tiger.png',
        spin: 'images/spin_btn.png',
        logo: 'images/logo.png',
        bull: 'images/bull.png',
        jade: 'images/jade.png',
        envelope: 'images/red_envelope.png',
        firecracker: 'images/firecracker.png',
        orange: 'images/orange.png',
        gold: 'images/gold_nugget.png'
    },
    sounds: {
        spin: 'media/spin.mp3',
        win: 'media/win.mp3',
        click: 'media/click.mp3',
        bg: 'media/background.mp3'
    }
};

const SYMBOLS = ['bull', 'jade', 'envelope', 'firecracker', 'orange', 'gold', 'tiger'];
let gameActive = false;
let userBalance = 0;
let currentBet = 1.00;

// Helper para carregar um único asset com tratamento de erro
async function loadAsset(type, key, src) {
    return new Promise((resolve) => {
        if (type === 'image') {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                console.log(`[Asset] Imagem carregada: ${key}`);
                resolve({ key, status: 'ok' });
            };
            img.onerror = () => {
                console.warn(`[Asset] Falha na imagem: ${key} (${src})`);
                resolve({ key, status: 'error' });
            };
        } else {
            const audio = new Audio();
            audio.src = src;
            audio.onloadedmetadata = () => {
                console.log(`[Asset] Áudio carregado: ${key}`);
                resolve({ key, status: 'ok' });
            };
            audio.onerror = () => {
                console.warn(`[Asset] Falha no áudio: ${key} (${src})`);
                resolve({ key, status: 'error' });
            };
            // Timeout para áudio (2s) para não travar o carregamento
            setTimeout(() => resolve({ key, status: 'timeout' }), 2000);
        }
    });
}

async function startPreload() {
    const loader = document.getElementById('loader');
    const game = document.getElementById('game-container');
    
    console.log("Iniciando Preload...");

    // Timeout Global de Segurança (8 segundos)
    const safetyTimeout = new Promise(resolve => 
        setTimeout(() => {
            console.warn("Preload atingiu timeout de segurança. Forçando início.");
            resolve('timeout');
        }, 8000)
    );

    const assetPromises = [
        ...Object.entries(ASSETS.images).map(([k, s]) => loadAsset('image', k, s)),
        ...Object.entries(ASSETS.sounds).map(([k, s]) => loadAsset('audio', k, s))
    ];

    // Espera todos os assets ou o timeout
    await Promise.race([
        Promise.all(assetPromises),
        safetyTimeout
    ]);

    console.log("Preload finalizado.");
    
    // Transição visual
    if (loader) loader.style.display = 'none';
    if (game) game.classList.remove('hidden');
    
    initGame();
}

function initGame() {
    console.log("Inicializando interface do jogo...");
    gameActive = true;
    
    // Solicita saldo inicial ao wrapper
    window.parent.postMessage({ type: 'GAME_READY' }, '*');
    
    setupEventListeners();
    renderInitialReels();
}

function setupEventListeners() {
    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) {
        spinBtn.addEventListener('click', () => {
            if (gameActive) handleSpin();
        });
    }

    // Listener para mensagens do sistema (Saldo)
    window.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_BALANCE') {
            userBalance = event.data.balance;
            updateUI();
        }
    });
}

function handleSpin() {
    if (userBalance < currentBet) {
        alert("Saldo Insuficiente");
        return;
    }

    playSound('click');
    gameActive = false;
    
    // Avisa o sistema para descontar aposta
    window.parent.postMessage({ type: 'SLOT_BET', amount: currentBet }, '*');

    // Inicia animação visual
    const reels = document.querySelectorAll('.reel');
    reels.forEach(r => r.classList.add('spinning'));

    playSound('spin');

    // Simulação de resultado (No futuro viria do servidor)
    setTimeout(() => {
        stopSpin();
    }, 2000);
}

function stopSpin() {
    const reels = document.querySelectorAll('.reel');
    reels.forEach(r => {
        r.classList.remove('spinning');
        const randomSym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const img = r.querySelector('img');
        if (img) img.src = ASSETS.images[randomSym] || ASSETS.images.tiger;
    });

    gameActive = true;
    checkWin();
}

function checkWin() {
    // Lógica simplificada de vitória para o protótipo (10% de chance)
    if (Math.random() > 0.9) {
        const winAmount = currentBet * 5;
        playSound('win');
        window.parent.postMessage({ type: 'SLOT_WIN', amount: winAmount }, '*');
    }
}

function playSound(key) {
    const src = ASSETS.sounds[key];
    if (src) {
        const audio = new Audio(src);
        audio.volume = 0.5;
        audio.play().catch(() => console.log("Autoplay bloqueado pelo browser"));
    }
}

function updateUI() {
    const balEl = document.getElementById('balance-display');
    if (balEl) balEl.innerText = `R$ ${userBalance.toFixed(2)}`;
}

function renderInitialReels() {
    const container = document.getElementById('reels-container');
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        const img = document.createElement('img');
        img.src = ASSETS.images.tiger;
        reel.appendChild(img);
        container.appendChild(reel);
    }
}

// Inicia o processo ao carregar o DOM
document.addEventListener('DOMContentLoaded', startPreload);
