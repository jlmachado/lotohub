/**
 * Fortune Tiger - Motor de Slot Premium
 */

// Símbolos e Multiplicadores
const SYMBOLS = [
    { char: '🐯', weight: 1, mult: 100, name: 'Tiger' }, // Wild
    { char: '🧧', weight: 3, mult: 50, name: 'Envelope' },
    { char: '💰', weight: 5, mult: 25, name: 'Bag' },
    { char: '🍊', weight: 8, mult: 10, name: 'Orange' },
    { char: '🎆', weight: 10, mult: 5, name: 'Cracker' },
    { char: '🍬', weight: 15, mult: 2, name: 'Candy' }
];

// Estado do Jogo
const state = {
    balance: 1000.00,
    bet: 1.00,
    isSpinning: false,
    autoSpin: false,
    grid: [[0,0,0], [0,0,0], [0,0,0]] // 3 colunas x 3 linhas
};

// Elementos do DOM
const reels = [
    document.getElementById('reel-0'),
    document.getElementById('reel-1'),
    document.getElementById('reel-2')
];
const displayBalance = document.getElementById('display-balance');
const displayBet = document.getElementById('display-bet');
const displayLastWin = document.getElementById('display-last-win');
const spinBtn = document.getElementById('spin-btn');
const winBanner = document.getElementById('win-banner');
const winValue = document.getElementById('win-value');

// Inicialização
function init() {
    updateUI();
    fillInitialReels();
    
    spinBtn.addEventListener('click', () => {
        if (!state.isSpinning) startSpin();
    });

    document.getElementById('btn-plus').addEventListener('click', () => {
        if (!state.isSpinning) {
            state.bet = Math.min(500, state.bet + 1);
            updateUI();
        }
    });

    document.getElementById('btn-minus').addEventListener('click', () => {
        if (!state.isSpinning) {
            state.bet = Math.max(1, state.bet - 1);
            updateUI();
        }
    });
}

function updateUI() {
    displayBalance.innerText = `R$ ${state.balance.toFixed(2).replace('.', ',')}`;
    displayBet.innerText = `R$ ${state.bet.toFixed(2).replace('.', ',')}`;
}

function fillInitialReels() {
    reels.forEach((reel, i) => {
        reel.innerHTML = '';
        for (let j = 0; j < 3; j++) {
            const sym = getRandomSymbol();
            reel.appendChild(createSymbolElement(sym.char));
            state.grid[i][j] = sym;
        }
    });
}

function getRandomSymbol() {
    const totalWeight = SYMBOLS.reduce((acc, s) => acc + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (const s of SYMBOLS) {
        if (random < s.weight) return s;
        random -= s.weight;
    }
    return SYMBOLS[SYMBOLS.length - 1];
}

function createSymbolElement(char) {
    const el = document.createElement('div');
    el.className = 'symbol';
    el.innerText = char;
    return el;
}

async function startSpin() {
    if (state.balance < state.bet) {
        alert("Saldo insuficiente!");
        return;
    }

    state.isSpinning = true;
    state.balance -= state.bet;
    updateUI();
    winBanner.classList.add('hidden');
    
    // Animação de Giro
    const spinPromises = reels.map((reel, index) => animateReel(reel, index));
    
    const results = await Promise.all(spinPromises);
    state.grid = results;

    checkWin();
    state.isSpinning = false;
}

function animateReel(reel, index) {
    return new Promise(resolve => {
        const duration = 1000 + (index * 400);
        const startTime = Date.now();
        const reelSymbols = [];

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTime;

            if (elapsed < duration) {
                // Durante o giro, mostra símbolos aleatórios borrados
                reel.innerHTML = '';
                for (let i = 0; i < 3; i++) {
                    const sym = getRandomSymbol();
                    const el = createSymbolElement(sym.char);
                    el.classList.add('spinning');
                    reel.appendChild(el);
                }
            } else {
                // Parar giro e definir resultado final
                clearInterval(interval);
                reel.innerHTML = '';
                const finalResult = [];
                for (let i = 0; i < 3; i++) {
                    const sym = getRandomSymbol();
                    finalResult.push(sym);
                    reel.appendChild(createSymbolElement(sym.char));
                }
                resolve(finalResult);
            }
        }, 80);
    });
}

function checkWin() {
    let totalWin = 0;
    const g = state.grid;
    const winCombinations = [];

    // Linhas Horizontais
    for (let row = 0; j < 3; row++) {
        if (checkMatch(g[0][row], g[1][row], g[2][row])) {
            const sym = getWinningSymbol(g[0][row], g[1][row], g[2][row]);
            totalWin += state.bet * sym.mult;
            winCombinations.push({ type: 'row', index: row });
        }
    }

    // Diagonais
    if (checkMatch(g[0][0], g[1][1], g[2][2])) {
        const sym = getWinningSymbol(g[0][0], g[1][1], g[2][2]);
        totalWin += state.bet * sym.mult;
        winCombinations.push({ type: 'diag', index: 0 });
    }
    if (checkMatch(g[0][2], g[1][1], g[2][0])) {
        const sym = getWinningSymbol(g[0][2], g[1][1], g[2][0]);
        totalWin += state.bet * sym.mult;
        winCombinations.push({ type: 'diag', index: 1 });
    }

    if (totalWin > 0) {
        state.balance += totalWin;
        displayLastWin.innerText = `R$ ${totalWin.toFixed(2)}`;
        showWin(totalWin);
        updateUI();
    } else {
        displayLastWin.innerText = `R$ 0,00`;
    }
}

function checkMatch(s1, s2, s3) {
    const chars = [s1.char, s2.char, s3.char];
    const hasTiger = chars.includes('🐯');
    
    // Se todos são iguais
    if (s1.char === s2.char && s2.char === s3.char) return true;
    
    // Regra Wild (Tiger substitui qualquer um)
    const nonWild = chars.filter(c => c !== '🐯');
    if (nonWild.length === 0) return true; // Tudo Tiger
    if (nonWild.length === 1) return true; // Dois Tigers e um outro
    if (nonWild.length === 2 && nonWild[0] === nonWild[1]) return true; // Um Tiger e dois iguais
    
    return false;
}

function getWinningSymbol(s1, s2, s3) {
    const chars = [s1.char, s2.char, s3.char];
    const nonWild = chars.filter(c => c !== '🐯');
    if (nonWild.length === 0) return SYMBOLS[0]; // Retorna Tiger se for tudo Wild
    return SYMBOLS.find(s => s.char === nonWild[0]);
}

function showWin(amount) {
    winValue.innerText = `R$ ${amount.toFixed(2).replace('.', ',')}`;
    winBanner.classList.remove('hidden');
    
    // Feedback tátil
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    
    setTimeout(() => {
        winBanner.classList.add('hidden');
    }, 3000);
}

// Iniciar
init();
