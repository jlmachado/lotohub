/**
 * @fileOverview Engine Profissional do Fortune Tiger.
 * Gerencia a lógica de bobinas, resultados e integração com o Wrapper.
 */

const CONFIG = {
    symbolCount: 7,
    reelCount: 3,
    rowsPerReel: 3,
    spinDuration: 2500,
    symbols: [
        { id: 1, name: 'Gold', value: 10, img: 'https://picsum.photos/seed/gold/120/120' },
        { id: 2, name: 'Tiger', value: 5, img: 'https://picsum.photos/seed/tiger/120/120' },
        { id: 3, name: 'Coin', value: 2, img: 'https://picsum.photos/seed/coin/120/120' },
        { id: 4, name: 'Envelope', value: 1, img: 'https://picsum.photos/seed/env/120/120' },
        { id: 5, name: 'Firecracker', value: 0.5, img: 'https://picsum.photos/seed/fire/120/120' },
        { id: 6, name: 'Orange', value: 0.3, img: 'https://picsum.photos/seed/orange/120/120' },
        { id: 7, name: 'Wild', value: 20, img: 'https://picsum.photos/seed/wild/120/120' }
    ]
};

class TigerGame {
    constructor() {
        this.balance = 0;
        this.bet = 1.00;
        this.isSpinning = false;
        this.isTurbo = false;
        this.isAuto = false;

        this.initDOM();
        this.initReels();
        this.bindEvents();
        this.updateUI();
    }

    initDOM() {
        this.reels = [
            document.querySelector('#reel-1 .reel-strip'),
            document.querySelector('#reel-2 .reel-strip'),
            document.querySelector('#reel-3 .reel-strip')
        ];
        this.btnSpin = document.getElementById('btn-spin');
        this.btnPlus = document.getElementById('btn-plus');
        this.btnMinus = document.getElementById('btn-minus');
        this.btnTurbo = document.getElementById('btn-turbo');
        this.btnAuto = document.getElementById('btn-auto');
        this.winDisplay = document.getElementById('win-amount');
        this.betDisplay = document.getElementById('bet-amount');
        this.jackpotDisplay = document.getElementById('jackpot-value');
        this.overlay = document.getElementById('big-win-overlay');
    }

    initReels() {
        this.reels.forEach(reel => {
            this.fillReel(reel);
        });
    }

    fillReel(reel) {
        reel.innerHTML = '';
        // Create 20 symbols for the strip to allow loop
        for (let i = 0; i < 20; i++) {
            const symbolData = CONFIG.symbols[Math.floor(Math.random() * CONFIG.symbols.length)];
            const div = document.createElement('div');
            div.className = 'symbol';
            div.dataset.id = symbolData.id;
            div.innerHTML = `<img src="${symbolData.img}" alt="${symbolData.name}">`;
            reel.appendChild(div);
        }
    }

    bindEvents() {
        this.btnSpin.addEventListener('click', () => this.spin());
        
        this.btnPlus.addEventListener('click', () => {
            if (this.isSpinning) return;
            this.bet = Math.min(100, this.bet + 1);
            this.updateUI();
        });

        this.btnMinus.addEventListener('click', () => {
            if (this.isSpinning) return;
            this.bet = Math.max(1, this.bet - 1);
            this.updateUI();
        });

        this.btnTurbo.addEventListener('click', () => {
            this.isTurbo = !this.isTurbo;
            this.btnTurbo.classList.toggle('active', this.isTurbo);
        });

        this.btnAuto.addEventListener('click', () => {
            this.isAuto = !this.isAuto;
            this.btnAuto.classList.toggle('active', this.isAuto);
            if (this.isAuto && !this.isSpinning) this.spin();
        });
    }

    updateUI() {
        this.betDisplay.innerText = `R$ ${this.bet.toFixed(2)}`;
        // Simular variação no jackpot
        const jp = 12000 + (Math.random() * 500);
        this.jackpotDisplay.innerText = `R$ ${jp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    async spin() {
        if (this.isSpinning) return;
        this.isSpinning = true;
        this.winDisplay.innerText = 'R$ 0,00';
        
        // Notify parent about bet
        window.parent.postMessage({ type: 'SLOT_BET', amount: this.bet }, '*');

        // Animate reels
        const duration = this.isTurbo ? 800 : CONFIG.spinDuration;
        
        this.reels.forEach((reel, i) => {
            reel.classList.add('spinning');
            // Random end position
            const stopPos = -1500 - (Math.floor(Math.random() * 500));
            
            setTimeout(() => {
                reel.classList.remove('spinning');
                reel.style.transform = `translateY(${stopPos}px)`;
                
                if (i === 2) {
                    this.onSpinEnd();
                }
            }, duration + (i * 200));
        });
    }

    onSpinEnd() {
        this.isSpinning = false;
        
        // Simular lógica de vitória (10% de chance)
        if (Math.random() > 0.9) {
            const winMultiplier = 2 + (Math.random() * 10);
            const winAmount = this.bet * winMultiplier;
            this.showWin(winAmount);
        } else if (this.isAuto) {
            setTimeout(() => this.spin(), 1000);
        }
    }

    showWin(amount) {
        this.winDisplay.innerText = `R$ ${amount.toFixed(2).replace('.', ',')}`;
        
        // Show Big Win Overlay for large wins
        if (amount > this.bet * 5) {
            this.overlay.classList.remove('hidden');
            document.getElementById('big-win-value').innerText = `R$ ${amount.toFixed(2)}`;
            
            setTimeout(() => {
                this.overlay.classList.add('hidden');
                window.parent.postMessage({ type: 'SLOT_WIN', amount: amount }, '*');
                if (this.isAuto) setTimeout(() => this.spin(), 1000);
            }, 3000);
        } else {
            window.parent.postMessage({ type: 'SLOT_WIN', amount: amount }, '*');
            if (this.isAuto) setTimeout(() => this.spin(), 1000);
        }
    }
}

// Start Game
window.onload = () => {
    new TigerGame();
};
