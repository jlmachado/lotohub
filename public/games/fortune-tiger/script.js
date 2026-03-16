/**
 * Engine Profissional Fortune Tiger - Clone de Referência
 * Gerencia Bobinas, Detecção de Vitória e Comunicação com AppContext
 */

const SYMBOLS = [
    { id: 'wild', img: 'https://picsum.photos/seed/tiger/200/200', value: 100 },
    { id: 'gold', img: 'https://picsum.photos/seed/gold/200/200', value: 50 },
    { id: 'sycee', img: 'https://picsum.photos/seed/sycee/200/200', value: 25 },
    { id: 'bag', img: 'https://picsum.photos/seed/bag/200/200', value: 15 },
    { id: 'envelope', img: 'https://picsum.photos/seed/env/200/200', value: 10 },
    { id: 'firework', img: 'https://picsum.photos/seed/fire/200/200', value: 5 },
    { id: 'orange', img: 'https://picsum.photos/seed/orange/200/200', value: 2 }
];

const PAYLINES = [
    [0, 0, 0], // Top row
    [1, 1, 1], // Middle row
    [2, 2, 2], // Bottom row
    [0, 1, 2], // Diagonal down
    [2, 1, 0]  // Diagonal up
];

class FortuneTiger {
    constructor() {
        this.balance = 0;
        this.bet = 1.00;
        this.isSpinning = false;
        this.turbo = false;
        
        this.initElements();
        this.setupEvents();
        this.renderInitialState();
        
        // Notifica o wrapper que o jogo carregou
        window.parent.postMessage({ type: 'GAME_READY' }, '*');
    }

    initElements() {
        this.reels = [
            document.getElementById('reel-0'),
            document.getElementById('reel-1'),
            document.getElementById('reel-2')
        ];
        this.balanceEl = document.getElementById('balance-display');
        this.winEl = document.getElementById('win-display');
        this.betEl = document.getElementById('bet-display');
        this.spinBtn = document.getElementById('spin-btn');
        this.bigWinOverlay = document.getElementById('big-win-overlay');
    }

    setupEvents() {
        this.spinBtn.onclick = () => this.spin();
        
        document.getElementById('btn-plus').onclick = () => {
            this.bet = Math.min(500, this.bet + 1);
            this.updateUI();
        };
        
        document.getElementById('btn-minus').onclick = () => {
            this.bet = Math.max(1, this.bet - 1);
            this.updateUI();
        };

        window.addEventListener('message', (e) => {
            if (e.data.type === 'SYNC_BALANCE') {
                this.balance = e.data.balance;
                this.updateUI();
            }
        });
    }

    renderInitialState() {
        this.reels.forEach(reel => {
            for (let i = 0; i < 3; i++) {
                this.addSymbol(reel, this.getRandomSymbol());
            }
        });
    }

    getRandomSymbol() {
        return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }

    addSymbol(reel, symbol) {
        const div = document.createElement('div');
        div.className = 'symbol';
        div.innerHTML = `<img src="${symbol.img}" alt="${symbol.id}">`;
        div.dataset.id = symbol.id;
        reel.appendChild(div);
    }

    updateUI() {
        this.balanceEl.innerText = `R$ ${this.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        this.betEl.innerText = `R$ ${this.bet.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    }

    async spin() {
        if (this.isSpinning || this.balance < this.bet) return;

        this.isSpinning = true;
        this.winEl.innerText = 'R$ 0,00';
        
        // Emite evento de aposta para o wrapper
        window.parent.postMessage({ type: 'SLOT_BET', amount: this.bet }, '*');

        // Animação de Giro
        this.reels.forEach((reel, i) => {
            reel.classList.add('spinning');
            // Remove símbolos antigos após delay
            setTimeout(() => {
                reel.innerHTML = '';
                for (let s = 0; i < 3; i++) this.addSymbol(reel, this.getRandomSymbol());
            }, 500 + (i * 200));
        });

        // Delay para resultado
        await new Promise(r => setTimeout(res => r(), 2000));

        this.stopSpin();
    }

    stopSpin() {
        this.reels.forEach(reel => reel.classList.remove('spinning'));
        
        // Gera resultado final (3x3)
        const matrix = [];
        this.reels.forEach(reel => {
            reel.innerHTML = '';
            const column = [];
            for (let i = 0; i < 3; i++) {
                const s = this.getRandomSymbol();
                this.addSymbol(reel, s);
                column.push(s);
            }
            matrix.push(column);
        });

        this.checkWins(matrix);
        this.isSpinning = false;
    }

    checkWins(matrix) {
        let totalWin = 0;
        
        PAYLINES.forEach(line => {
            const s1 = matrix[0][line[0]];
            const s2 = matrix[1][line[1]];
            const s3 = matrix[2][line[2]];

            if (s1.id === s2.id && s2.id === s3.id) {
                totalWin += s1.value * (this.bet / 10);
            } else if (s1.id === 'wild' || s2.id === 'wild' || s3.id === 'wild') {
                // Lógica de Wild simplificada
                if ((s1.id === s2.id || s1.id === 'wild' || s2.id === 'wild') && 
                    (s2.id === s3.id || s2.id === 'wild' || s3.id === 'wild')) {
                    totalWin += s1.value * (this.bet / 10);
                }
            }
        });

        if (totalWin > 0) {
            this.handleWin(totalWin);
        }
    }

    handleWin(amount) {
        this.winEl.innerText = `R$ ${amount.toFixed(2).replace('.', ',')}`;
        window.parent.postMessage({ type: 'SLOT_WIN', amount: amount }, '*');
        
        if (amount >= this.bet * 10) {
            this.showBigWin(amount);
        }
    }

    showBigWin(amount) {
        const overlay = document.getElementById('big-win-overlay');
        document.getElementById('big-win-value').innerText = `R$ ${amount.toFixed(2)}`;
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 3000);
    }
}

// Inicializa o jogo
new FortuneTiger();
