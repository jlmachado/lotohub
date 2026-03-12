/**
 * @fileOverview Lógica Real do Fortune Tiger Clone.
 * Implementa o motor de slot 3x3, detecção de linhas e gestão de saldo.
 */

const SYMBOLS = [
    { id: 1, name: 'Tiger (WILD)', img: 'images/tiger.png', value: 250 },
    { id: 2, name: 'Gold Ornament', img: 'images/gold.png', value: 100 },
    { id: 3, name: 'Jade', img: 'images/jade.png', value: 50 },
    { id: 4, name: 'Bag of Coins', img: 'images/bag.png', value: 20 },
    { id: 5, name: 'Envelopes', img: 'images/envelope.png', value: 10 },
    { id: 6, name: 'Firecrackers', img: 'images/firecrackers.png', value: 5 },
    { id: 7, name: 'Oranges', img: 'images/orange.png', value: 3 }
];

const PAY_LINES = [
    [0, 0, 0], // Topo horizontal
    [1, 1, 1], // Meio horizontal
    [2, 2, 2], // Baixo horizontal
    [0, 1, 2], // Diagonal descendente
    [2, 1, 0]  // Diagonal ascendente
];

let balance = 1000.00;
let currentBet = 1.00;
let isSpinning = false;
let isTurbo = false;

// DOM Elements
const balanceDisplay = document.getElementById('balance-display');
const betDisplay = document.getElementById('bet-display');
const spinBtn = document.getElementById('spin-btn');
const turboBtn = document.getElementById('turbo-toggle');
const winModal = document.getElementById('win-modal');
const winAmountDisplay = document.getElementById('modal-win-amount');

// Initialization
function init() {
    const reels = document.querySelectorAll('.symbol-container');
    reels.forEach(container => {
        for (let i = 0; i < 3; i++) {
            const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            container.appendChild(createSymbolElement(sym));
        }
    });

    updateUI();
}

function createSymbolElement(symbol, isBlur = false) {
    const div = document.createElement('div');
    div.className = `symbol ${isBlur ? 'blur' : ''}`;
    div.dataset.id = symbol.id;
    
    const img = document.createElement('img');
    img.src = symbol.img;
    img.alt = symbol.name;
    // Fallback if image not found
    img.onerror = () => {
        img.src = `https://placehold.co/100x100/red/gold?text=${symbol.name.charAt(0)}`;
    };
    
    div.appendChild(img);
    return div;
}

function updateUI() {
    balanceDisplay.textContent = `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    betDisplay.textContent = `R$ ${currentBet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// Spin Logic
async function spin() {
    if (isSpinning || balance < currentBet) return;

    isSpinning = true;
    balance -= currentBet;
    updateUI();
    
    winModal.classList.add('hidden');
    document.querySelectorAll('.symbol').forEach(s => s.classList.remove('winning'));

    const containers = document.querySelectorAll('.symbol-container');
    const results = [];

    // Pre-generate results
    for (let i = 0; i < 3; i++) {
        results[i] = [
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        ];
    }

    const spinPromises = Array.from(containers).map((container, index) => {
        return new Promise(resolve => {
            const speed = isTurbo ? 50 : 100;
            const duration = (isTurbo ? 500 : 1000) + (index * 300);
            
            // Animation via transform
            container.style.transition = 'none';
            container.style.transform = 'translateY(0)';
            
            // Fill with random symbols for blur effect
            for(let j=0; j<10; j++) {
                const randSym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                container.prepend(createSymbolElement(randSym, true));
            }

            setTimeout(() => {
                container.style.transition = `transform ${duration}ms cubic-bezier(0.45, 0.05, 0.55, 0.95)`;
                container.style.transform = `translateY(0)`; // Simplified for pure CSS/JS
                
                // Final result replacement
                setTimeout(() => {
                    container.innerHTML = '';
                    results[index].forEach(sym => {
                        container.appendChild(createSymbolElement(sym));
                    });
                    resolve();
                }, duration);
            }, 10);
        });
    });

    await Promise.all(spinPromises);
    
    checkWins(results);
    isSpinning = false;
}

function checkWins(results) {
    let totalWin = 0;
    const winningSymbols = [];

    PAY_LINES.forEach((line, lineIdx) => {
        const s1 = results[0][line[0]];
        const s2 = results[1][line[1]];
        const s3 = results[2][line[2]];

        // Check for match or Wild (Tigre is ID 1)
        const isTiger = (s) => s.id === 1;
        
        const isMatch = (s1.id === s2.id || isTiger(s1) || isTiger(s2)) && 
                        (s2.id === s3.id || isTiger(s2) || isTiger(s3)) &&
                        (s1.id === s3.id || isTiger(s1) || isTiger(s3));

        if (isMatch) {
            // Determine winning symbol (not tiger if possible)
            const mainSym = [s1, s2, s3].find(s => s.id !== 1) || s1;
            const winVal = mainSym.value * currentBet;
            totalWin += winVal;
            
            // Mark winning positions for animation
            line.forEach((row, col) => winningSymbols.push({col, row}));
        }
    });

    if (totalWin > 0) {
        balance += totalWin;
        showWin(totalWin, winningSymbols);
    }
}

function showWin(amount, winners) {
    const containers = document.querySelectorAll('.symbol-container');
    winners.forEach(pos => {
        const symbol = containers[pos.col].children[pos.row];
        symbol.classList.add('winning');
    });

    winAmountDisplay.textContent = `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    winModal.classList.remove('hidden');
    updateUI();
}

// Event Listeners
spinBtn.addEventListener('click', spin);

turboBtn.addEventListener('click', () => {
    isTurbo = !isTurbo;
    turboBtn.classList.toggle('active');
});

document.getElementById('bet-plus').addEventListener('click', () => {
    if (isSpinning) return;
    currentBet += 1.00;
    updateUI();
});

document.getElementById('bet-minus').addEventListener('click', () => {
    if (isSpinning) return;
    currentBet = Math.max(1.00, currentBet - 1.00);
    updateUI();
});

init();
