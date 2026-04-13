let QUESTIONS = [];
let answered = 0;
let correct = 0;
let currentFilter = 'all';
let visibleQs = [];

async function inicializarCuestionario() {
  // Lista de archivos JSON por categoría dentro de la carpeta data/
  const archivos = [
    'data/cardiaco.json',
    'data/respiratorio.json',
    'data/calculo.json',
    'data/radiologia.json',
    'data/ekg.json'
  ];

  try {
    // Se ejecutan las peticiones de forma individual para evitar el fallo en cadena
    const promesas = archivos.map(url => 
      fetch(url)
        .then(async res => {
          if (!res.ok) return null; // Omite archivos no encontrados (404)
          try {
            return await res.json();
          } catch (e) {
            console.error(`Error de formato en ${url}:`, e);
            return null; // Omite archivos con errores de sintaxis
          }
        })
        .catch(() => null) // Captura fallos de conexión o red
    );

    const resultados = await Promise.all(promesas);

    // Se filtran los resultados nulos y se fusionan únicamente los objetos válidos
    QUESTIONS = resultados
      .filter(res => res !== null && res.preguntas)
      .flatMap(res => res.preguntas);
    
    console.log("Preguntas cargadas con éxito:", QUESTIONS.length);
    renderAll();
  } catch (error) {
    console.error("Error crítico durante la carga de datos:", error);
  }
}

function renderAll() {
  const container = document.getElementById('questionsContainer');
  if (!container) return;
  container.innerHTML = '';

  const filtered = QUESTIONS.filter(q => currentFilter === 'all' || q.cat === currentFilter).map(q => {
    let opts = q.opts.map((text, i) => ({text, isCorrect: i === q.ans}));
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    let newAns = opts.findIndex(o => o.isCorrect);
    return { ...q, currentOpts: opts.map(o => o.text), currentAns: newAns };
  });

  visibleQs = filtered;
  const totalNumElem = document.getElementById('totalNum');
  if (totalNumElem) totalNumElem.textContent = filtered.length;

  let prevCat = null;
  filtered.forEach((q, idx) => {
    if (q.cat !== prevCat) {
      const div = document.createElement('div');
      div.className = 'category-divider';
      const catLabels = {cardiaco:'Anatomía & Fisiología Cardíaca', respiratorio:'Anatomía & Fisiología Respiratoria', calculo:'Cálculos Clínicos', radiologia:'Radiología Torácica', ekg:'Electrocardiograma'};
      const catClass = {cardiaco:'cat-cardiac', respiratorio:'cat-resp', calculo:'cat-calc', radiologia:'cat-radio', ekg:'cat-ekg'};
      div.innerHTML = `<div class="cat-badge ${catClass[q.cat] || ''}">${catLabels[q.cat] || q.cat}</div><div class="cat-line"></div>`;
      container.appendChild(div);
      prevCat = q.cat;
    }
    container.appendChild(buildCard(q, idx));
  });

  updateProgress();
}

function buildCard(q, idx) {
  const card = document.createElement('div');
  card.className = 'q-card';
  card.id = `card-${idx}`;

  const optsHTML = q.currentOpts.map((o, i) => {
    const keys = ['A','B','C','D'];
    return `<button class="option-btn" onclick="answer(${idx}, ${i})" id="opt-${idx}-${i}">
      <span class="option-key">${keys[i]}</span><span>${o}</span>
    </button>`;
  }).join('');

  card.innerHTML = `
    <div class="q-header">
      <span class="q-num">Q${idx + 1}</span>
      <span class="q-text">${q.q}</span>
    </div>
    <div class="options">${optsHTML}</div>
    <button class="hint-toggle" onclick="toggleHint(${idx})">💡 Pista</button>
    <div class="hint-box" id="hint-${idx}">${q.hint}</div>
    <div class="feedback" id="fb-${idx}"></div>
  `;
  return card;
}

function answer(idx, chosen) {
  const q = visibleQs[idx];
  const card = document.getElementById(`card-${idx}`);
  if (!card || card.dataset.done) return;
  card.dataset.done = '1';

  const isCorrect = chosen === q.currentAns;
  const keys = ['A','B','C','D'];

  for (let i = 0; i < q.currentOpts.length; i++) {
    const btn = document.getElementById(`opt-${idx}-${i}`);
    if (btn) {
      btn.disabled = true;
      if (i === q.currentAns) btn.classList.add('correct');
      else if (i === chosen && !isCorrect) btn.classList.add('wrong');
    }
  }

  const fb = document.getElementById(`fb-${idx}`);
  if (fb) {
    if (isCorrect) {
      fb.className = 'feedback correct';
      fb.innerHTML = `<strong>✓ Correcto</strong>${q.just}`;
      correct++;
      card.classList.add('answered-correct');
    } else {
      fb.className = 'feedback wrong';
      fb.innerHTML = `<strong>✗ Incorrecto — La respuesta correcta es ${keys[q.currentAns]}</strong>${q.just}`;
      card.classList.add('answered-wrong');
    }
    fb.style.display = 'block';
  }

  answered++;
  const scoreDisp = document.getElementById('scoreDisplay');
  const ansCount = document.getElementById('answeredCount');
  if (scoreDisp) scoreDisp.textContent = correct;
  if (ansCount) ansCount.textContent = `${answered} respondidas`;
  
  updateProgress();

  const allAnswered = document.querySelectorAll('.q-card[data-done]').length;
  if (allAnswered === visibleQs.length && visibleQs.length > 0) showSummary();
}

function toggleHint(idx) {
  const hint = document.getElementById(`hint-${idx}`);
  if (hint) {
    hint.style.display = hint.style.display === 'block' ? 'none' : 'block';
  }
}

function updateProgress() {
  const total = visibleQs.length;
  const pct = total > 0 ? answered / total : 0;
  const circumference = 150.8;
  const circle = document.getElementById('progressCircle');
  const num = document.getElementById('progressNum');
  
  if (circle) circle.style.strokeDashoffset = circumference * (1 - pct);
  if (num) num.textContent = answered;
}

function filterCat(cat, btn) {
  currentFilter = cat;
  answered = 0; 
  correct = 0;
  
  const scoreDisp = document.getElementById('scoreDisplay');
  const ansCount = document.getElementById('answeredCount');
  const summary = document.getElementById('summary');
  
  if (scoreDisp) scoreDisp.textContent = '0';
  if (ansCount) ansCount.textContent = '0 respondidas';
  if (summary) summary.style.display = 'none';
  
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  
  renderAll();
}

function showSummary() {
  const total = visibleQs.length;
  const pct = Math.round((correct / total) * 100);
  const summary = document.getElementById('summary');
  if (!summary) return;

  const statCorrect = document.getElementById('statCorrect');
  const statWrong = document.getElementById('statWrong');
  const statPct = document.getElementById('statPct');
  const summarySub = document.getElementById('summarySub');
  const summaryIcon = document.getElementById('summaryIcon');
  const summaryTitle = document.getElementById('summaryTitle');

  if (statCorrect) statCorrect.textContent = correct;
  if (statWrong) statWrong.textContent = total - correct;
  if (statPct) statPct.textContent = pct + '%';
  if (summarySub) summarySub.textContent = `Respondiste ${total} preguntas con ${pct}% de precisión.`;

  if (pct >= 80) {
    if (summaryIcon) summaryIcon.textContent = '🏆';
    if (summaryTitle) summaryTitle.textContent = '¡Excelente desempeño!';
  } else if (pct >= 60) {
    if (summaryIcon) summaryIcon.textContent = '📚';
    if (summaryTitle) summaryTitle.textContent = 'Buen avance, sigue repasando.';
  } else {
    if (summaryIcon) summaryIcon.textContent = '🔬';
    if (summaryTitle) summaryTitle.textContent = 'Hay temas por reforzar.';
  }

  summary.style.display = 'block';
  summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function restart() {
  answered = 0; 
  correct = 0;
  const scoreDisp = document.getElementById('scoreDisplay');
  const ansCount = document.getElementById('answeredCount');
  const summary = document.getElementById('summary');
  
  if (scoreDisp) scoreDisp.textContent = '0';
  if (ansCount) ansCount.textContent = '0 respondidas';
  if (summary) summary.style.display = 'none';
  
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

inicializarCuestionario();