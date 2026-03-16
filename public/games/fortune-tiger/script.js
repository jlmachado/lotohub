
/**
 * @fileOverview Motor do Fortune Tiger - Sincronizado com assets oficiais.
 */

const SYMBOLS = [
    { id: 'bull', img: 'images/bull.png' },
    { id: 'jade', img: 'images/jade.png' },
    { id: 'red_envelope', img: 'images/red_envelope.png' },
    { id: 'firecracker', img: 'images/firecracker.png' },
    { id: 'orange', img: 'images/orange.png' },
    { id: 'gold_nugget', img: 'images/gold_nugget.png' },
    { id: 'tiger', img: 'images/tiger.png' } // WILD
];

const ASSETS_TO_LOAD = [
    'images/bg.png',
    'images/reel_bg.png',
    'images/tiger.png',
    'images/spin_btn.png',
    'images/logo.png',
    ...SYMBOLS.map(s => s.img),
    'media/spin.mp3',
    'media/win.mp3',
    'media/click.mp3',
    'media/background.mp3'
];

let balance = 0;
let currentBet = 1.00;
let isSpinning = false;

const audio = {
    spin: new Audio('media/spin.mp3'),
    win: new Audio('media/win.mp3'),
    click: new Audio('media/click.mp3'),
    bg: new Audio('media/background.mp3')
};

async function init() {
    console.log('[FT] Inicializando motor...');
    
    // Configura áudio de fundo
    audio.bg.loop = true;
    audio.bg.volume = 0.3;

    try {
        await preloadAssets();
        setupReels();
        setupEvents();
        
        // Revela o jogo
        document.getElementById('loader').style.display = 'none';
        document.getElementById('game-container').style.opacity = '1';
        
        console.log('[FT] Motor pronto.');
    } catch (err) {
        console.error('[FT] Erro fatal no bootstrap:', err);
        // Fallback: mesmo com erro de asset, tentamos mostrar o jogo
        document.getElementById('loader-text').innerText = 'ERRO AO CARREGAR. INICIANDO MESMO ASSIM...';
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('game-container').style.opacity = '1';
        }, 2000);
    }
}

async function preloadAssets() {
    const promises = ASSETS_TO_LOAD.map(src => {
        return new Promise((resolve) => {
            if (src.endsWith('.png') || src.endsWith('.jpg')) {
                const img = new Image();
                img.src = src;
                img.onload = resolve;
                img.onerror = () => {
                    console.warn(`[FT] Falha ao carregar imagem: ${src}`);
                    resolve(); // Resolvemos para não travar o loader
                };
            } else {
                // Audio
                resolve(); // Audio costuma ser carregado sob demanda ou via stream
            }
        });
    });

    // Timeout de segurança de 10s
    await Promise.race([
        Promise.all(promises),
        new Promise(res => setTimeout(res, 10000))
    ]);
}

function setupReels() {
    const container = document.getElementById('reels-container');
    for (let i = 0; i < 3; i++) {
        const reel = document.getElementById(`reel-${i}`);
        reel.innerHTML = '';
        for (let j = 0; j < 3; j++) {
            const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const div = document.createElement('div');
            div.className = 'symbol';
            div.innerHTML = `<img src="${sym.img}" alt="${sym.id}">`;
            reel.appendChild(div);
        }
    }
}

function setupEvents() {
    const spinBtn = document.getElementById('spin-btn');
    spinBtn.addEventListener('click', () => {
        if (isSpinning) return;
        handleSpin();
    });

    // Comunicação com o sistema principal (saldo)
    window.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_BALANCE') {
            balance = event.data.balance;
            updateDisplay();
        }
    });

    // Notifica sistema que o jogo está pronto
    window.parent.postMessage({ type: 'GAME_READY' }, '*');
}

async function handleSpin() {
    if (balance < currentBet) {
        window.parent.postMessage({ type: 'INSUFFICIENT_BALANCE' }, '*');
        return;
    }

    isSpinning = true;
    audio.click.play().catch(() => {});
    audio.spin.play().catch(() => {});
    
    // Notifica débito
    window.parent.postMessage({ type: 'SLOT_BET', amount: currentBet }, '*');
    balance -= currentBet;
    updateDisplay();

    // Animação de giro simples
    const reels = [0, 1, 2].map(id => document.getElementById(`reel-${id}`));
    reels.forEach(r => r.style.transition = 'none');
    
    // Simulação de resultado
    await new Promise(res => setTimeout(res, 1500));

    setupReels(); // Novo resultado aleatório
    
    isSpinning = false;
    
    // Simulação de ganho (10% de chance)
    if (Math.random() < 0.1) {
        const win = currentBet * 5;
        balance += win;
        audio.win.play().catch(() => {});
        window.parent.postMessage({ type: 'SLOT_WIN', amount: win }, '*');
        updateDisplay();
    }
}

function updateDisplay() {
    document.getElementById('balance-display').innerText = `R$ ${balance.toFixed(2).replace('.', ',')}`;
    document.getElementById('bet-display').innerText = `R$ ${currentBet.toFixed(2).replace('.', ',')}`;
}

// Inicia
init();
