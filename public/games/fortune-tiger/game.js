document.addEventListener('DOMContentLoaded', () => {
    const reels = document.querySelectorAll('.reel');
    const spinButton = document.getElementById('spinButton');
    const balanceDisplay = document.getElementById('balance');
    const betAmountDisplay = document.getElementById('betAmount');
    const decreaseBetButton = document.getElementById('decreaseBet');
    const increaseBetButton = document.getElementById('increaseBet');
    const loadingScreen = document.getElementById('loading-screen');

    let balance = 1000.00;
    const betLevels = [0.50, 1.00, 2.00, 5.00, 10.00];
    let currentBetIndex = 2;
    let isSpinning = false;
    
    const BASE = "/games/fortune-tiger/sprites/";
    const SYMBOL_IMG = {
        tiger: BASE + "tiger.png",
        diamond: BASE + "diamond.png",
        bag: BASE + "bag.png",
        bell: BASE + "bell.png",
        orange: BASE + "orange.png",
        red: BASE + "red.png",
        firecracker: BASE + "firecracker.png",
        scatter: BASE + "scatter.png"
    };

    const symbols = [
        { id: 'scatter', name: 'SCATTER' },
        { id: 'firecracker', name: 'FIRECRACKER' },
        { id: 'red', name: 'RED' },
        { id: 'bag', name: 'BAG' },
        { id: 'tiger', name: 'TIGER' },
        { id: 'bell', name: 'BELL' },
        { id: 'orange', name: 'ORANGE' },
        { id: 'diamond', name: 'DIAMOND' }
    ];

    const symbolValues = {
        'tiger': 100,
        'diamond': 50,
        'bag': 25,
        'bell': 10,
        'orange': 5,
        'red': 3,
        'firecracker': 2,
        'scatter': 1,
    };

    const setupGame = async () => {
        try {
            console.log("BOOT: Game initializing...");
            await loadAssets();
            updateBalance();
            updateBetAmount();
            reels.forEach(reel => createReel(reel, true));
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
            console.log("BOOT: Game ready!");
        } catch (error) {
            console.error("BOOT FAIL: Could not initialize game.", error);
            if (loadingScreen) {
                loadingScreen.innerHTML = `<div class="text-center"><p class="text-red-500 font-bold">Erro ao Carregar o Jogo</p><p class="text-sm text-gray-400">${error.message}</p></div>`;
            }
        }
    };
    
    const loadAssets = () => {
        console.log("LOADING ASSETS...");
        const assetPromises = Object.values(SYMBOL_IMG).map(src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    console.log(`ASSET OK: ${src}`);
                    resolve(src);
                };
                img.onerror = () => {
                    console.error(`ASSET FAIL: ${src}`);
                    reject(new Error(`Failed to load ${src}`));
                };
            });
        });

        const audioSrc = document.getElementById('spinSound')?.getAttribute('src');
        if (audioSrc) {
             assetPromises.push(new Promise((resolve, reject) => {
                const audio = new Audio();
                audio.src = audioSrc;
                audio.oncanplaythrough = () => {
                    console.log(`ASSET OK: ${audioSrc}`);
                    resolve(audioSrc);
                };
                audio.onerror = () => {
                    console.warn(`ASSET WARN: Could not load audio ${audioSrc}`);
                    resolve(audioSrc); // Resolve even if audio fails
                };
            }));
        }


        return Promise.allSettled(assetPromises).then(results => {
            results.forEach(result => {
                if (result.status === 'rejected') {
                    console.error(result.reason);
                    // Don't throw, allow the game to continue
                }
            });
            console.log("ASSET LOADING COMPLETE.");
        });
    };

    function createReel(reel, initial = false) {
        reel.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        // Create more symbols than visible for smooth scrolling
        const symbolCount = initial ? 20 : 10;

        for (let i = 0; i < symbolCount; i++) {
            const symbolIndex = Math.floor(Math.random() * symbols.length);
            const symbol = symbols[symbolIndex];
            const symbolElement = document.createElement('div');
            symbolElement.classList.add('symbol');
            symbolElement.innerHTML = `<img src="${SYMBOL_IMG[symbol.id]}" alt="${symbol.name}" />`;
            fragment.appendChild(symbolElement);
        }
        reel.appendChild(fragment);
    }

    function updateBalance() {
        balanceDisplay.textContent = `R$ ${balance.toFixed(2)}`;
    }

    function updateBetAmount() {
        betAmountDisplay.textContent = `R$ ${betLevels[currentBetIndex].toFixed(2)}`;
    }

    function spin() {
        if (isSpinning || balance < betLevels[currentBetIndex]) {
            if (balance < betLevels[currentBetIndex]) {
                alert("Saldo insuficiente!");
            }
            return;
        }

        isSpinning = true;
        balance -= betLevels[currentBetIndex];
        updateBalance();
        spinButton.disabled = true;
        
        const spinSound = document.getElementById('spinSound');
        if (spinSound) spinSound.play().catch(e => console.log("Audio play failed"));

        reels.forEach((reel, index) => {
            createReel(reel);
            const target = reel.lastChild;
            const style = getComputedStyle(reel);
            const backgroundPositionY = parseInt(style.backgroundPositionY, 10);
            
            reel.style.transition = 'none';
            reel.style.backgroundPositionY = `${backgroundPositionY}px`;

            setTimeout(() => {
                reel.style.transition = `background-position-y ${3 + index * 0.5}s cubic-bezier(0.25, 1, 0.5, 1)`;
                const finalPosition = 10 * 150; // 10 loops
                reel.style.backgroundPositionY = `${finalPosition}px`;
            }, 100);
        });

        setTimeout(checkWin, 4000);
    }

    function checkWin() {
        const finalSymbols = [];
        reels.forEach(reel => {
             // This logic needs to be more robust. Let's get the symbol in the middle
            const allSymbols = reel.querySelectorAll('.symbol');
            const middleIndex = Math.floor(allSymbols.length / 2); // Approximate middle
            const middleImg = allSymbols[middleIndex].querySelector('img');
            const src = middleImg.getAttribute('src');
            const symbolId = Object.keys(SYMBOL_IMG).find(key => SYMBOL_IMG[key] === src);
            finalSymbols.push(symbolId);
        });

        let winAmount = 0;
        // Simple win condition: three of the same symbol in the middle row
        if (finalSymbols[0] && finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2]) {
            const winningSymbol = finalSymbols[0];
            const multiplier = symbolValues[winningSymbol] || 1;
            winAmount = betLevels[currentBetIndex] * multiplier;
            balance += winAmount;
            
            const winSound = document.getElementById('winSound');
            if (winSound) winSound.play().catch(e => console.log("Audio play failed"));

            showWinMessage(winAmount);
            updateBalance();
        }

        isSpinning = false;
        spinButton.disabled = false;
    }
    
    function showWinMessage(amount) {
        const winMessage = document.getElementById('win-message');
        if (winMessage) {
            winMessage.textContent = `Você ganhou R$ ${amount.toFixed(2)}!`;
            winMessage.classList.remove('hidden');
            setTimeout(() => {
                winMessage.classList.add('hidden');
            }, 3000);
        }
    }


    decreaseBetButton.addEventListener('click', () => {
        if (currentBetIndex > 0) {
            currentBetIndex--;
            updateBetAmount();
        }
    });

    increaseBetButton.addEventListener('click', () => {
        if (currentBetIndex < betLevels.length - 1) {
            currentBetIndex++;
            updateBetAmount();
        }
    });

    spinButton.addEventListener('click', spin);

    setupGame();
});
