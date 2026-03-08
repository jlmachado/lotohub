// Efeito sonoro do botão
const ctaButton = document.getElementById("cta-btn");
const loadingMsg = document.getElementById("loading-msg");

if(ctaButton) {
    ctaButton.addEventListener("click", () => {
        // Toca o som (se existir e o navegador permitir)
        const clickSound = new Audio('/cassino/click.mp3');
        clickSound.play().catch(() => {}); // O catch evita erro se o autoplay for bloqueado

        // Mostra a mensagem de carregamento
        if(loadingMsg) {
            loadingMsg.textContent = "Carregando jogos...";
        }
    });
}

// Transição de página
function go(url){
  const f = document.getElementById("pageFade");
  if(!f){ window.location.href=url; return; }
  f.classList.add("on");
  setTimeout(()=> window.location.href=url, 250);
}

// Animação de moedas caindo
document.addEventListener('DOMContentLoaded', () => {
    const coinContainer = document.querySelector('.coin-container');
    if (!coinContainer) return;
    const numberOfCoins = 18;

    for (let i = 0; i < numberOfCoins; i++) {
        const coin = document.createElement('div');
        coin.classList.add('coin');
        
        const size = Math.random() * 15 + 5; // Moedas de 5px a 20px
        coin.style.width = `${size}px`;
        coin.style.height = `${size}px`;
        
        coin.style.left = `${Math.random() * 100}vw`;
        
        const duration = Math.random() * 5 + 3; // Duração de 3s a 8s
        coin.style.animationDuration = `${duration}s`;
        
        const delay = Math.random() * 5;
        coin.style.animationDelay = `${delay}s`;

        coin.style.filter = `blur(${Math.random() * 1.5}px)`;
        
        coinContainer.appendChild(coin);
    }
});
