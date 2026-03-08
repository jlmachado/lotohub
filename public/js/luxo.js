(function(){
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Carregar som (se existir)
  const clickAudio = new Audio("/sfx/click.mp3");
  clickAudio.volume = 0.25;
  clickAudio.preload = "auto";

  function safePlay(){
    try{
      clickAudio.currentTime = 0;
      const p = clickAudio.play();
      if(p && typeof p.catch === "function") p.catch(()=>{});
    }catch(e){}
  }

  // Selecionar elementos clicáveis grandes (sem mudar funções)
  const targets = Array.from(document.querySelectorAll("a, button, [onclick]"))
    .filter(el=>{
      const r = el.getBoundingClientRect();
      // pega só “alvos grandes” (cards/botões), ignora setas pequenas
      return r.width >= 140 && r.height >= 44;
    });

  targets.forEach(el=>{
    el.classList.add("lux-press");
    if(!reduce) el.classList.add("lux-shine");

    // se parece um “card”, aplica glow luxo
    const style = getComputedStyle(el);
    const br = parseFloat(style.borderRadius || "0");
    if(br >= 14){
      el.classList.add("lux-card");
    }
  });

  // Detectar botões dourados (Terminal / Entrar etc)
  document.querySelectorAll("button, .btn, .button, a.btn").forEach(el=>{
    const txt = (el.textContent||"").toLowerCase();
    if(txt.includes("terminal") || txt.includes("entrar") || txt.includes("deposit") || txt.includes("pix")){
      el.classList.add("lux-gold");
    }
  });

  // Clique: som + vibração leve (sem impedir clique original)
  function haptic(){
    if(navigator.vibrate) navigator.vibrate(12);
  }

  document.addEventListener("click", (e)=>{
    const t = e.target.closest("a, button, [onclick]");
    if(!t) return;

    // só para alvos grandes
    const r = t.getBoundingClientRect();
    if(r.width < 140 || r.height < 44) return;

    // som e vibração (não quebra se falhar)
    safePlay();
    haptic();
  }, true);

})();