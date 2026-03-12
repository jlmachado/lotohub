// --- CONFIGURAÇÕES DO JOGO ---
const SYMBOLS = [
    { id: 'wild', img: 'https://picsum.photos/seed/FT-wild/150/150', weight: 5, mult: 50 },
    { id: 'gold', img: 'https://picsum.photos/seed/FT-gold/150/150', weight: 10, mult: 20 },
    { id: 'envelope', img: 'https://picsum.photos/seed/FT-env/150/150', weight: 15, mult: 10 },
    { id: 'bag', img: 'https://picsum.photos/seed/FT-bag/150/150', weight: 20, mult: 5 },
    { id: 'fire', img: 'https://picsum.photos/seed/FT-fire/150/150', weight: 25, mult: 3 },
    { id: 'orange', img: 'https://picsum.photos/seed/FT-ora/150/150', weight: 30, mult: 2 }
];

const PAY_LINES = [
    [0, 0, 0], // Topo
    [1, 1, 1], // Meio
    [2, 2, 2], // Baixo
    [0, 1, 2], // Diagonal Descendente
    [2, 1, 0]  // Diagonal Ascendente
];

// --- ESTADO DO JOGO ---
let balance = 1000.00;
let currentBet = 10.00;
let isSpinning = false;
let autoPlay = false;

// --- ELEMENTOS ---
const reelsElements = [
    document.getElementById('reel-0'),
    document.getElementById('reel-1'),
    document.getElementById('reel-2')
];

const spinBtn = document.getElementById('btn-spin');
const balanceText = document.getElementById('balance-display');
const betText = document.getElementById('bet-display');
const winDisplay = document.getElementById('last-win-display');
const winOverlay = document.getElementById('win-overlay');
const winAmountText = document.getElementById('win-amount-display');

// --- INICIALIZAÇÃO ---
function init() {
    reelsElements.forEach(reel => {
        for (let i = 0; i < 3; i++) {
            const sym = getRandomSymbol();
            const div = createSymbolElement(sym);
            reel.appendChild(div);
        }
    });
    updateUI();
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

function createSymbolElement(symbol, isBlur = false) {
    const div = document.createElement('div');
    div.className = `symbol ${isBlur ? 'blur' : ''}`;
    div.dataset.id = symbol.id;
    const img = document.createElement('img');
    img.src = symbol.img;
    div.appendChild(img);
    return div;
}

function updateUI() {
    balanceText.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;
    betText.textContent = `R$ ${currentBet.toFixed(2).replace('.', ',')}`;
}

// --- LÓGICA DE GIRO ---
async function spin() {
    if (isSpinning || balance < currentBet) return;

    isSpinning = true;
    balance -= currentBet;
    winDisplay.textContent = 'R$ 0,00';
    updateUI();
    winOverlay.classList.add('hidden');
    spinBtn.classList.add('spinning');

    // Limpar animações antigas
    document.querySelectorAll('.symbol').forEach(s => s.classList.remove('symbol-win-anim'));

    const spinResults = [];

    // Animando cilindros
    const spinPromises = reelsElements.map(async (reel, index) => {
        const result = [];
        // Delay sequencial de parada
        await new Promise(res => setTimeout(res, index * 200));

        // Simular giro (substituir símbolos rápido)
        for (let i = 0; i < 15; i++) {
            reel.prepend(createSymbolElement(getRandomSymbol(), true));
            reel.lastChild.remove();
            await new Promise(res => setTimeout(res, 50));
        }

        // Parada final
        reel.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const sym = getRandomSymbol();
            result.push(sym.id);
            reel.appendChild(createSymbolElement(sym));
        }
        spinResults.push(result);
    });

    await Promise.all(spinPromises);
    
    checkWins(spinResults);
    spinBtn.classList.remove('spinning');
    isSpinning = false;

    if (autoPlay) setTimeout(spin, 1500);
}

function checkWins(results) {
    // Matriz transposta para facilitar check de linhas
    // results[coluna][linha]
    let totalWin = 0;
    const winningSymbols = [];

    PAY_LINES.forEach((line, lineIndex) => {
        const s1 = results[0][line[0]];
        const s2 = results[1][line[1]];
        const s3 = results[2][line[2]];

        if (isMatch(s1, s2, s3)) {
            const symConfig = SYMBOLS.find(s => s.id === (s1 === 'wild' ? (s2 === 'wild' ? s3 : s2) : s1));
            const win = currentBet * (symConfig?.mult || 2);
            totalWin += win;
            
            // Guardar posições para animar
            winningSymbols.push({ col: 0, row: line[0] });
            winningSymbols.push({ col: 1, row: line[1] });
            winningSymbols.push({ col: 2, row: line[2] });
        }
    });

    if (totalWin > 0) {
        balance += totalWin;
        winDisplay.textContent = `R$ ${totalWin.toFixed(2).replace('.', ',')}`;
        showWin(totalWin, winningSymbols);
    }
}

function isMatch(s1, s2, s3) {
    if (s1 === 'wild' && s2 === 'wild' && s3 === 'wild') return true;
    
    const nonWild = [s1, s2, s3].filter(s => s !== 'wild');
    if (nonWild.length === 0) return true;
    
    const first = nonWild[0];
    return nonWild.every(s => s === first);
}

function showWin(amount, positions) {
    // Animar símbolos
    positions.forEach(pos => {
        const symbolEl = reelsElements[pos.col].children[pos.row];
        symbolEl.classList.add('symbol-win-anim');
    });

    if (amount >= currentBet * 5) {
        winAmountText.textContent = `R$ ${amount.toFixed(2).replace('.', ',')}`;
        winOverlay.classList.remove('hidden');
        setTimeout(() => winOverlay.classList.add('hidden'), 3000);
    }
    updateUI();
}

// --- LISTENERS ---
spinBtn.addEventListener('click', spin);

document.getElementById('btn-plus').addEventListener('click', () => {
    if (isSpinning) return;
    currentBet = Math.min(500, currentBet + 10);
    updateUI();
});

document.getElementById('btn-minus').addEventListener('click', () => {
    if (isSpinning) return;
    currentBet = Math.max(1, currentBet - 10);
    updateUI();
});

document.getElementById('btn-auto').addEventListener('click', (e) => {
    autoPlay = !autoPlay;
    e.target.style.color = autoPlay ? 'var(--gold)' : '#fff';
    if (autoPlay && !isSpinning) spin();
});

// Iniciar
init();