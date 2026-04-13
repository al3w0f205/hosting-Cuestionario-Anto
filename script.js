let QUESTIONS = [];
let answered = 0;
let correct = 0;
let currentFilter = 'all';
let visibleQs = [];

async function inicializarCuestionario() {
  try {
    const respuesta = await fetch('preguntas.json');
    const datos = await respuesta.json();
    QUESTIONS = datos.lista_preguntas;
    renderAll();
  } catch (error) {
    console.error("Error al cargar la base de preguntas:", error);
  }
}

function renderAll() {
  const container = document.getElementById('questionsContainer');
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
  document.getElementById('totalNum').textContent = filtered.length;

  let prevCat = null;
  filtered.forEach((q, idx) => {
    if (q.cat !== prevCat) {
      const div = document.createElement('div');
      div.className = 'category-divider';
      const catLabels = {cardiaco:'Anatomía & Fisiología Cardíaca', respiratorio:'Anatomía & Fisiología Respiratoria', calculo:'Cálculos Clínicos', radiologia:'Radiología Torácica', ekg:'Electrocardiograma'};
      const catClass = {cardiaco:'cat-cardiac', respiratorio:'cat-resp', calculo:'cat-calc', radiologia:'cat-radio', ekg:'cat-ekg'};
      div.innerHTML = `<div class="cat-badge ${catClass[q.cat]}">${catLabels[q.cat]}</div><div class="cat-line"></div>`;
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
  if (card.dataset.done) return;
  card.dataset.done = '1';

  const isCorrect = chosen === q.currentAns;
  const keys = ['A','B','C','D'];

  for (let i = 0; i < q.currentOpts.length; i++) {
    const btn = document.getElementById(`opt-${idx}-${i}`);
    btn.disabled = true;
    if (i === q.currentAns) btn.classList.add('correct');
    else if (i === chosen && !isCorrect) btn.classList.add('wrong');
  }

  const fb = document.getElementById(`fb-${idx}`);
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

  answered++;
  document.getElementById('scoreDisplay').textContent = correct;
  document.getElementById('answeredCount').textContent = `${answered} respondidas`;
  updateProgress();

  const allAnswered = document.querySelectorAll('.q-card[data-done]').length;
  if (allAnswered === visibleQs.length) showSummary();
}

function toggleHint(idx) {
  const hint = document.getElementById(`hint-${idx}`);
  hint.style.display = hint.style.display === 'block' ? 'none' : 'block';
}

function updateProgress() {
  const total = visibleQs.length;
  const pct = total > 0 ? answered / total : 0;
  const circumference = 150.8;
  document.getElementById('progressCircle').style.strokeDashoffset = circumference * (1 - pct);
  document.getElementById('progressNum').textContent = answered;
}

function filterCat(cat, btn) {
  currentFilter = cat;
  answered = 0; correct = 0;
  document.getElementById('scoreDisplay').textContent = '0';
  document.getElementById('answeredCount').textContent = '0 respondidas';
  document.getElementById('summary').style.display = 'none';
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAll();
}

function showSummary() {
  const total = visibleQs.length;
  const pct = Math.round((correct / total) * 100);
  const summary = document.getElementById('summary');
  document.getElementById('statCorrect').textContent = correct;
  document.getElementById('statWrong').textContent = total - correct;
  document.getElementById('statPct').textContent = pct + '%';
  document.getElementById('summarySub').textContent = `Respondiste ${total} preguntas con ${pct}% de precisión.`;

  if (pct >= 80) {
    document.getElementById('summaryIcon').textContent = '🏆';
    document.getElementById('summaryTitle').textContent = '¡Excelente desempeño!';
  } else if (pct >= 60) {
    document.getElementById('summaryIcon').textContent = '📚';
    document.getElementById('summaryTitle').textContent = 'Buen avance, sigue repasando.';
  } else {
    document.getElementById('summaryIcon').textContent = '🔬';
    document.getElementById('summaryTitle').textContent = 'Hay temas por reforzar.';
  }

  summary.style.display = 'block';
  summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function restart() {
  answered = 0; correct = 0;
  document.getElementById('scoreDisplay').textContent = '0';
  document.getElementById('answeredCount').textContent = '0 respondidas';
  document.getElementById('summary').style.display = 'none';
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

inicializarCuestionario();