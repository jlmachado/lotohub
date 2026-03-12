/**
 * @fileOverview Lógica Real do Fortune Tiger Slot Machine.
 * Baseado no repositório de referência.
 */

const SYMBOLS = [
    { id: 1, name: 'tiger', multiplier: 50, img: 'images/symbols/tiger.png' }, // WILD
    { id: 2, name: 'gold_pot', multiplier: 20, img: 'images/symbols/gold_pot.png' },
    { id: 3, name: 'coin_bag', multiplier: 10, img: 'images/symbols/coin_bag.png' },
    { id: 4, name: 'red_envelope', multiplier: 5, img: 'images/symbols/red_envelope.png' },
    { id: 5, name: 'firecrackers', multiplier: 3, img: 'images/symbols/firecrackers.png' },
    { id: 6, name: 'orange', multiplier: 2, img: 'images/symbols/orange.png' }
];

const PAY_LINES = [
    [0, 0, 0], // Top
    [1, 1, 1], // Middle
    [2, 2, 2], // Bottom
    [0, 1, 2], // Diagonal 1
    [2, 1, 0]  // Diagonal 2
];

let balance = 1000.00;
let currentBet = 1.00;
let isSpinning = false;
let isTurbo = false;

// Elements
const balanceEl = document.getElementById('balance');
const winEl = document.getElementById('last-win');
const betEl = document.getElementById('bet-amount');
const spinBtn = document.getElementById('spin-button');
const turboBtn = document.getElementById('btn-turbo');
const winPopup = document.getElementById('win-popup');
const winValuePopup = document.getElementById('win-value');

// Initialization
function init() {
    setupReels();
    updateUI();
    
    document.getElementById('btn-plus').onclick = () => {
        currentBet = Math.min(100, currentBet + 1);
        updateUI();
    };
    
    document.getElementById('btn-minus').onclick = () => {
        currentBet = Math.max(1, currentBet - 1);
        updateUI();
    };
    
    turboBtn.onclick = () => {
        isTurbo = !isTurbo;
        turboBtn.classList.toggle('active', isTurbo);
    };
    
    spinBtn.onclick = spin;
}

function updateUI() {
    balanceEl.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;
    betEl.textContent = `R$ ${currentBet.toFixed(2).replace('.', ',')}`;
}

function setupReels() {
    for (let i = 0; i < 3; i++) {
        const reel = document.querySelector(`#reel-${i} .reel-content`);
        reel.innerHTML = '';
        for (let j = 0; j < 3; j++) {
            const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            reel.appendChild(createSymbolElement(sym));
        }
    }
}

function createSymbolElement(symbol) {
    const div = document.createElement('div');
    div.className = 'symbol';
    div.dataset.id = symbol.id;
    const img = document.createElement('img');
    img.src = symbol.img;
    img.alt = symbol.name;
    // Fallback if image not found
    img.onerror = () => {
        div.style.background = '#ffd700';
        div.style.color = '#000';
        div.innerHTML = `<b>${symbol.name.charAt(0).toUpperCase()}</b>`;
    };
    div.appendChild(img);
    return div;
}

async function spin() {
    if (isSpinning || balance < currentBet) return;
    
    isSpinning = true;
    balance -= currentBet;
    updateUI();
    winEl.textContent = 'R$ 0,00';
    
    const results = [];
    const spinDuration = isTurbo ? 500 : 1500;
    
    // Start Animation
    for (let i = 0; i < 3; i++) {
        const reel = document.querySelector(`#reel-${i} .reel-content`);
        const result = Array.from({length: 3}, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        results.push(result);
        
        animateReel(i, result, spinDuration + (i * 200));
    }
    
    await new Promise(res => setTimeout(res, spinDuration + 600));
    
    checkWins(results);
    isSpinning = false;
}

function animateReel(index, finalSymbols, duration) {
    const reel = document.querySelector(`#reel-${index} .reel-content`);
    const startTime = performance.now();
    
    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            // Random icons during spin for blur effect
            if (Math.random() > 0.7) {
                const tempSym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                reel.prepend(createSymbolElement(tempSym));
                if (reel.children.length > 5) reel.lastChild.remove();
            }
            requestAnimationFrame(update);
        } else {
            // Set final icons
            reel.innerHTML = '';
            finalSymbols.forEach(s => reel.appendChild(createSymbolElement(s)));
        }
    }
    requestAnimationFrame(update);
}

function checkWins(results) {
    let totalWin = 0;
    const winningLines = [];

    // Matrix result: results[column][row]
    // We need results[row][column] for easier payline check
    const matrix = [
        [results[0][0], results[1][0], results[2][0]],
        [results[0][1], results[1][1], results[2][1]],
        [results[0][2], results[1][2], results[2][2]]
    ];

    PAY_LINES.forEach((line, lineIndex) => {
        const [r1, r2, r3] = line;
        const s1 = results[0][r1];
        const s2 = results[1][r2];
        const s3 = results[2][r3];

        // Wild check (id 1 is tiger)
        const isWild = (s) => s.id === 1;
        
        let winningSymbol = null;
        if (!isWild(s1)) winningSymbol = s1;
        else if (!isWild(s2)) winningSymbol = s2;
        else if (!isWild(s3)) winningSymbol = s3;
        else winningSymbol = SYMBOLS[0]; // All wild!

        const match1 = s1.id === winningSymbol.id || isWild(s1);
        const match2 = s2.id === winningSymbol.id || isWild(s2);
        const match3 = s3.id === winningSymbol.id || isWild(s3);

        if (match1 && match2 && match3) {
            const lineWin = currentBet * winningSymbol.multiplier;
            totalWin += lineWin;
            winningLines.push(line);
            
            // Visual highlight
            highlightWinningLine(line);
        }
    });

    if (totalWin > 0) {
        balance += totalWin;
        updateUI();
        winEl.textContent = `R$ ${totalWin.toFixed(2).replace('.', ',')}`;
        showWinPopup(totalWin);
    }
}

function highlightWinningLine(line) {
    line.forEach((row, col) => {
        const reel = document.getElementById(`reel-${col}`);
        const sym = reel.querySelectorAll('.symbol')[row];
        sym.classList.add('winning');
        setTimeout(() => sym.classList.remove('winning'), 2000);
    });
}

function showWinPopup(value) {
    winValuePopup.textContent = `R$ ${value.toFixed(2).replace('.', ',')}`;
    winPopup.classList.remove('hidden');
    setTimeout(() => {
        winPopup.classList.add('hidden');
    }, 2500);
}

window.onload = init;
