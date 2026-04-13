let QUESTIONS = [];
let failedQuestions = []; 
let answered = 0;
let correct = 0;
let currentFilter = 'all';
let visibleQs = [];
let isReviewMode = false;

async function inicializarCuestionario() {
    const archivos = [
        'data/cardiaco.json',
        'data/respiratorio.json',
        'data/calculos.json',
        'data/radiologia.json',
        'data/ekg.json'
    ];

    try {
        const promesas = archivos.map(url => 
            fetch(url)
                .then(async res => {
                    if (!res.ok) return null;
                    try {
                        return await res.json();
                    } catch (e) {
                        console.error(`Error de formato en ${url}:`, e);
                        return null;
                    }
                })
                .catch(() => null)
        );

        const resultados = await Promise.all(promesas);
        QUESTIONS = resultados
            .filter(res => res !== null && res.preguntas)
            .flatMap(res => res.preguntas);
        
        // Carga inicial sin mezcla automática para preservar el orden del JSON
        prepareVisibleQuestions();
        renderAll();
    } catch (error) {
        console.error("Error crítico en la carga de datos:", error);
    }
}

/**
 * Filtra las preguntas según el modo y la categoría actual
 */
function prepareVisibleQuestions() {
    let sourcePool = isReviewMode ? [...failedQuestions] : [...QUESTIONS];
    let filtered = sourcePool.filter(q => currentFilter === 'all' || q.cat === currentFilter);

    visibleQs = filtered.map(q => {
        let opts = q.opts.map((text, i) => ({ text, isCorrect: i === q.ans }));
        // Las opciones internas sí se mezclan para evitar patrones de posición
        shuffle(opts);
        return { 
            ...q, 
            currentOpts: opts.map(o => o.text), 
            currentAns: opts.findIndex(o => o.isCorrect) 
        };
    });
}

/**
 * Función accionada por el botón de Shuffle
 */
function manualShuffle() {
    if (visibleQs.length === 0) return;
    
    // Mezcla el arreglo actual de preguntas visibles
    shuffle(visibleQs);
    
    // Reinicia el progreso local para evitar inconsistencias al mezclar a mitad de sesión
    reiniciarEstadoLocal();
    renderAll();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function renderAll() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    container.innerHTML = '';

    document.getElementById('totalNum').textContent = visibleQs.length;

    let prevCat = null;
    visibleQs.forEach((q, idx) => {
        const showDivider = !isReviewMode || (isReviewMode && currentFilter === 'all');
        
        if (showDivider && q.cat !== prevCat) {
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
    actualizarBotonRepaso();
}

function buildCard(q, idx) {
    const card = document.createElement('div');
    card.className = 'q-card';
    card.id = `card-${idx}`;

    const optsHTML = q.currentOpts.map((o, i) => {
        const keys = ['A','B','C','D','E'];
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
    const keys = ['A','B','C','D','E'];

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
            
            if (!failedQuestions.some(fq => fq.q === q.q)) {
                failedQuestions.push(q);
            }
        }
        fb.style.display = 'block';
    }

    answered++;
    document.getElementById('scoreDisplay').textContent = correct;
    document.getElementById('answeredCount').textContent = `${answered} respondidas`;
    
    updateProgress();
    actualizarBotonRepaso();
    
    if (document.querySelectorAll('.q-card[data-done]').length === visibleQs.length) showSummary();
}

function actualizarBotonRepaso() {
    const btn = document.getElementById('reviewBtn');
    const span = document.getElementById('errorCount');
    const relevantErrors = failedQuestions.filter(q => currentFilter === 'all' || q.cat === currentFilter);
    
    if (relevantErrors.length > 0) {
        btn.style.display = 'inline-block';
        span.textContent = relevantErrors.length;
    } else {
        btn.style.display = 'none';
    }
}

function filterCat(cat, btn) {
    isReviewMode = false;
    currentFilter = cat;
    reiniciarEstadoLocal();
    
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    prepareVisibleQuestions();
    renderAll();
}

function reviewErrors(btn) {
    isReviewMode = true;
    reiniciarEstadoLocal();
    btn.classList.add('active');
    prepareVisibleQuestions();
    renderAll();
}

function reiniciarEstadoLocal() {
    answered = 0;
    correct = 0;
    document.getElementById('scoreDisplay').textContent = '0';
    document.getElementById('answeredCount').textContent = '0 respondidas';
    document.getElementById('summary').style.display = 'none';
    
    // Limpia estados de cards previas
    document.querySelectorAll('.q-card').forEach(c => {
        delete c.dataset.done;
        c.classList.remove('answered-correct', 'answered-wrong');
    });
}

function toggleHint(idx) {
    const hint = document.getElementById(`hint-${idx}`);
    if (hint) hint.style.display = hint.style.display === 'block' ? 'none' : 'block';
}

function updateProgress() {
    const total = visibleQs.length;
    const pct = total > 0 ? answered / total : 0;
    const circle = document.getElementById('progressCircle');
    if (circle) circle.style.strokeDashoffset = 150.8 * (1 - pct);
    document.getElementById('progressNum').textContent = answered;
}

function showSummary() {
    const total = visibleQs.length;
    const pct = Math.round((correct / total) * 100);
    const summary = document.getElementById('summary');
    
    document.getElementById('statCorrect').textContent = correct;
    document.getElementById('statWrong').textContent = total - correct;
    document.getElementById('statPct').textContent = pct + '%';
    document.getElementById('summarySub').textContent = `Completaste ${total} preguntas con ${pct}% de acierto.`;

    summary.style.display = 'block';
    summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function restart() {
    reiniciarEstadoLocal();
    prepareVisibleQuestions();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

inicializarCuestionario();