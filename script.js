// --- Chips : sélection de l'action ---
  let action = "";
  const chips = document.querySelectorAll('#actionChips .chip');
  chips.forEach(c => c.addEventListener('click', () => {
    const wasActive = c.classList.contains('active');
    chips.forEach(x => x.classList.remove('active'));
    if(!wasActive){ c.classList.add('active'); action = c.textContent; }
    else { action = ""; }
    render();
  }));

  // --- Récupère une valeur propre ---
  const val = id => document.getElementById(id).value.trim();

  // --- Formule de relecture (enrobe le prompt construit) ---
  function reviewWrapper(prompt){
    return `Tu es un relecteur de prompts. Je vais te donner un prompt que j'ai rédigé.
Ton rôle est de l'améliorer — surtout pas de le réécrire en plus long.

Analyse-le selon trois critères :
1. Contexte — Le rôle, l'objectif et l'audience sont-ils clairs ? Manque-t-il une info dont tu aurais besoin pour bien répondre ?
2. Tâche — L'action demandée est-elle précise et sans ambiguïté ?
3. Spécificité — Le format, la longueur et le ton attendus sont-ils définis ?

Réponds dans cet ordre :
1. Ce qui manque ou reste ambigu (liste courte, va à l'essentiel).
2. Les questions à me poser si une info importante manque.
3. Une version corrigée et resserrée, prête à copier, dans un bloc à part.

Règle absolue : reste clair et concis. N'ajoute pas de sections ou de techniques inutiles juste pour faire long. Un bon prompt est précis, pas gonflé.

Voici mon prompt à relire :
${prompt}`;
  }

  function render(){
    saveState();
    const role = val('role');
    const objectif = val('objectif');
    const audience = val('audience');
    const contexte = val('contexte');
    const tache = val('tache');
    const contenu = val('contenu');
    const format = val('format');
    const longueur = val('longueur');
    const ton = val('ton');
    const eviter = val('eviter');
    const exemple = val('exemple');
    const tSteps = document.getElementById('t_steps').checked;
    const tSearch = document.getElementById('t_search').checked;
    const tAsk = document.getElementById('t_ask').checked;

    let blocks = [];

    // CONTEXTE
    let ctx = [];
    if(role) ctx.push("Je suis " + role + ".");
    if(objectif) ctx.push(objectif.charAt(0).toUpperCase() + objectif.slice(1) + ".");
    if(audience) ctx.push("Je m'adresse à : " + audience + ".");
    if(contexte) ctx.push(contexte);
    if(ctx.length) blocks.push("# Contexte\n" + ctx.join(" "));

    // TÂCHE
    let tk = [];
    if(action && tache) tk.push(action + " : " + tache);
    else if(action) tk.push(action + " la tâche suivante.");
    else if(tache) tk.push(tache);
    if(tk.length) blocks.push("# Tâche\n" + tk.join(" "));

    // CONTENU À TRAITER
    if(contenu) blocks.push("# Contenu à traiter\n" + contenu);

    // SPÉCIFICITÉ
    let spec = [];
    if(format) spec.push("- Format : " + format);
    if(longueur) spec.push("- Longueur : " + longueur);
    if(ton) spec.push("- Ton : " + ton);
    if(eviter) spec.push("- À éviter : " + eviter);
    if(tSteps) spec.push("- Procède étape par étape.");
    if(tSearch){
      spec.push("- Cherche les informations les plus récentes avant de répondre, plutôt que de te fier à ta mémoire.");
      spec.push("- Appuie-toi sur des sources fiables et cite-les.");
    }
    if(tAsk) spec.push("- Si une information importante te manque, pose-moi des questions avant de répondre.");
    if(spec.length) blocks.push("# Spécificité\n" + spec.join("\n"));

    // EXEMPLE(S)
    if(exemple) blocks.push("# Exemple(s) du résultat attendu\n" + exemple);

    const out = document.getElementById('output');
    const h2 = document.querySelector('.preview-top h2');
    const tReview = document.getElementById('t_review').checked;

    if(blocks.length === 0){
      if(h2) h2.textContent = "Ton prompt";
      out.innerHTML = '<span class="empty">Commence à remplir les étapes… ton prompt apparaîtra ici.</span>';
      return;
    }

    const built = blocks.join("\n\n");

    if(tReview){
      if(h2) h2.textContent = "Ta demande de relecture";
      out.textContent = reviewWrapper(built);
    } else {
      if(h2) h2.textContent = "Ton prompt";
      out.textContent = built;
    }
  }

  // Écoute tous les champs
  document.querySelectorAll('input[type=text], textarea, input[type=checkbox]')
    .forEach(el => el.addEventListener('input', render));
  document.querySelectorAll('input[type=checkbox]')
    .forEach(el => el.addEventListener('change', render));

  // Copier
  const copyBtn = document.getElementById('copyBtn');

  function fallbackCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch(e){ ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function showCopied(ok){
    copyBtn.textContent = ok ? "Copié ✓" : "Sélectionne + Ctrl+C";
    copyBtn.classList.toggle('done', ok);
    setTimeout(() => { copyBtn.textContent = "Copier"; copyBtn.classList.remove('done'); }, 1800);
  }

  copyBtn.addEventListener('click', () => {
    const text = document.getElementById('output').textContent;
    if(text.includes('Commence à remplir')) return;

    if(navigator.clipboard && window.isSecureContext){
      navigator.clipboard.writeText(text)
        .then(() => showCopied(true))
        .catch(() => showCopied(fallbackCopy(text)));
    } else {
      showCopied(fallbackCopy(text));
    }
  });

  // --- Sauvegarde locale (fonctionne quand tu ouvres le fichier depuis ton ordinateur) ---
  const STORAGE_KEY = 'canevas-prompt-claude-v2';
  const fieldIds = ['role','objectif','audience','contexte','tache','contenu','format','longueur','ton','eviter','exemple'];
  const checkIds = ['t_steps','t_search','t_ask','t_review'];

  function saveState(){
    try{
      const data = {fields:{}, checks:{}, action};
      fieldIds.forEach(id=>{const el=document.getElementById(id); if(el) data.fields[id]=el.value;});
      checkIds.forEach(id=>{const el=document.getElementById(id); if(el) data.checks[id]=el.checked;});
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }catch(e){}
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const data = JSON.parse(raw);
      if(data.fields) fieldIds.forEach(id=>{const el=document.getElementById(id); if(el && data.fields[id]!=null) el.value=data.fields[id];});
      if(data.checks) checkIds.forEach(id=>{const el=document.getElementById(id); if(el && typeof data.checks[id]==='boolean') el.checked=data.checks[id];});
      if(data.action){ action=data.action; chips.forEach(c=>{ if(c.textContent===action) c.classList.add('active'); }); }
    }catch(e){}
  }

  // --- Réinitialiser (double-clic de confirmation, sans pop-up bloquante) ---
  const resetBtn = document.getElementById('resetBtn');
  let resetArmed = false;
  let resetTimer = null;

  function disarmReset(){
    resetArmed = false;
    resetBtn.textContent = 'Réinitialiser le canevas';
    resetBtn.classList.remove('armed');
    if(resetTimer){ clearTimeout(resetTimer); resetTimer = null; }
  }

  resetBtn.addEventListener('click', () => {
    if(!resetArmed){
      resetArmed = true;
      resetBtn.textContent = 'Clique encore pour confirmer';
      resetBtn.classList.add('armed');
      resetTimer = setTimeout(disarmReset, 3000);
      return;
    }
    fieldIds.forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
    checkIds.forEach(id=>{const el=document.getElementById(id); if(el) el.checked=false;});
    action=''; chips.forEach(c=>c.classList.remove('active'));
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    disarmReset();
    render();
  });

  loadState();
  render();