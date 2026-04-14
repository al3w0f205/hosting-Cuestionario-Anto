/* ═══════════════════════════════════════════
   DEVQUEST script.js
   Quiz engine y GitHub Code Viewer
═══════════════════════════════════════════ */

let QUESTIONS = [];
let failedQuestions = [];
let answered = 0;
let correct = 0;
let currentFilter = 'all';
let visibleQs = [];
let isReviewMode = false;
let isExamMode = false;
let isTimerMode = false;
let timerValue = 45;
let globalTimerInterval = null;
let categoryStats = {};

let ghOwner = '';
let ghRepo = '';
let fileCache = {};
let recentFiles = [];

async function init() {
    const archivos = ['data/algoritmos.json', 'data/estructuras.json', 'data/redes.json', 'data/bd.json', 'data/patrones.json', 'data/c.json'];
    try {
        const promesas = archivos.map(url => fetch(url).then(async res => res.ok ? await res.json() : null).catch(() => null));
        const resultados = await Promise.all(promesas);
        QUESTIONS = resultados.filter(res => res !== null && res.preguntas).flatMap(res => res.preguntas);
        
        const categorias = [...new Set(QUESTIONS.map(q => q.cat))];
        categorias.forEach(c => categoryStats[c] = { correct: 0, total: 0 });
        
        updateMasteryUI();
        prepareVisibleQuestions();
        renderAll();
    } catch (error) { console.error("Error crítico:", error); }
}

function switchMode(mode) {
    document.body.dataset.mode = mode;
    document.getElementById('tabQuiz').classList.toggle('active', mode === 'quiz');
    document.getElementById('tabCode').classList.toggle('active', mode === 'code');
    
    const tabCodex = document.getElementById('tabCodex');
    if(tabCodex) tabCodex.classList.toggle('active', mode === 'codex');

    document.querySelectorAll('.quiz-main, .quiz-sidebar, .code-main, .code-sidebar, .codex-main').forEach(el => {
        if(el) el.style.display = 'none';
    });

    if (mode === 'quiz') {
        document.querySelector('.quiz-main').style.display = 'block';
        document.querySelector('.quiz-sidebar').style.display = 'block';
        document.getElementById('navStats').style.display = 'flex';
    } else if (mode === 'code') {
        document.getElementById('codeMain').style.display = 'flex';
        document.getElementById('codeSidebar').style.display = 'block';
        document.getElementById('navStats').style.display = 'none';
    } else if (mode === 'codex') {
        document.getElementById('codexMain').style.display = 'block';
        document.getElementById('navStats').style.display = 'none';
        cargarCodice();
    }
}

async function cargarCodice() {
    const container = document.getElementById('codexContainer');
    if (container.innerHTML !== '') return; 

    try {
        const res = await fetch('data/codice_c.json');
        if (!res.ok) throw new Error('Archivo no encontrado');
        const data = await res.json();

        data.lecciones.forEach((leccion, index) => {
            const card = document.createElement('div');
            card.className = 'codex-card';

            const titulo = leccion.titulo || 'Módulo de Lectura';
            const concepto = leccion.concepto || leccion.texto || 'Contenido no disponible. Verifica tu codice_c.json';

            card.innerHTML = `
                <div class="codex-card-header">
                    <span class="codex-module-badge">MÓDULO ${index + 1}</span>
                    <h3 class="codex-card-title">${titulo}</h3>
                </div>
                <p class="codex-card-content">${concepto}</p>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = `<p style="color: var(--warn); text-align: center;">Error al cargar el códice verifica la ruta del archivo JSON o su estructura.</p>`;
    }
}

function updateMasteryUI() {
    const container = document.getElementById('masteryIndex');
    if (!container) return;
    container.innerHTML = '';
    const labels = { algoritmos: 'Algoritmos', estructuras: 'Estructuras', redes: 'Redes', bd: 'BD', patrones: 'Patrones', sintaxis: 'Sintaxis C', punteros: 'Punteros', memoria: 'Memoria' };
    const colors = { algoritmos: 'var(--accent)', estructuras: 'var(--accent2)', redes: '#f472b6', bd: '#fb923c', patrones: '#4ade80', sintaxis: '#eab308', punteros: '#a855f7', memoria: '#ef4444' };
    Object.keys(categoryStats).forEach(cat => {
        const s = categoryStats[cat];
        const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
        container.innerHTML += `
            <div class="mastery-item">
                <div class="mastery-info"><span>${labels[cat] || cat}</span><span>${pct}%</span></div>
                <div class="mastery-bar"><div class="mastery-fill" style="width:${pct}%;background:${colors[cat]||'var(--accent)'}"></div></div>
            </div>`;
    });
}

function searchQuestions(term) {
    const lower = term.toLowerCase();
    document.querySelectorAll('.q-card').forEach(card => {
        const textContent = card.textContent.toLowerCase();
        if (textContent.includes(lower)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function startAdaptiveExam() {
    let hasHistory = Object.values(categoryStats).some(s => s.total > 0);
    if (!hasHistory) {
        alert("Responde algunas preguntas primero para que el tutor analice tus debilidades estructurales.");
        return;
    }

    let weights = {};
    let totalWeight = 0;
    Object.keys(categoryStats).forEach(cat => {
        const s = categoryStats[cat];
        const errorRate = s.total > 0 ? (s.total - s.correct) / s.total : 0.5;
        weights[cat] = errorRate + 0.1; 
        totalWeight += weights[cat];
    });

    let pool = [...QUESTIONS];
    let adaptiveQs = [];
    
    for(let i = 0; i < 20 && pool.length > 0; i++) {
        let r = Math.random() * totalWeight;
        let cumulative = 0;
        let selectedCat = Object.keys(weights)[0];
        
        for (let cat of Object.keys(weights)) {
            cumulative += weights[cat];
            if (r <= cumulative) {
                selectedCat = cat;
                break;
            }
        }
        
        let catQuestions = pool.filter(q => q.cat === selectedCat);
        if(catQuestions.length === 0) {
            let randIndex = Math.floor(Math.random() * pool.length);
            adaptiveQs.push(pool.splice(randIndex, 1)[0]);
        } else {
            let randIndex = Math.floor(Math.random() * catQuestions.length);
            let q = catQuestions[randIndex];
            adaptiveQs.push(q);
            pool = pool.filter(pq => pq.q !== q.q);
        }
    }

    isReviewMode = false;
    currentFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.filter-btn[onclick*="all"]');
    if(allBtn) allBtn.classList.add('active');

    visibleQs = adaptiveQs.map(q => {
        const opts = q.opts.map((text, i) => ({ text, isCorrect: i === q.ans }));
        shuffle(opts);
        return { ...q, currentOpts: opts.map(o => o.text), currentAns: opts.findIndex(o => o.isCorrect) };
    });

    answered = 0; 
    correct = 0;
    clearInterval(globalTimerInterval);
    document.getElementById('summary').style.display = 'none';
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleCheatSheet() {
    const isCheat = document.getElementById('cheatSheetToggle').checked;
    if(isCheat) {
        document.querySelectorAll('.q-card').forEach((card, idx) => {
            if(card.dataset.done) return;
            const q = visibleQs[idx];
            const opts = card.querySelectorAll('.option-btn');
            opts.forEach((opt, oIdx) => {
                if(oIdx !== q.currentAns) {
                    opt.style.display = 'none';
                } else {
                    opt.classList.add('correct');
                }
            });
        });
    } else {
        restart();
    }
}

function toggleExamMode() { isExamMode = document.getElementById('examModeToggle').checked; restart(); }

function updateTimerValue() {
    const v = parseInt(document.getElementById('customTimeInput').value);
    if (!isNaN(v) && v > 0) timerValue = v;
}

function toggleTimerMode() {
    isTimerMode = document.getElementById('timerToggle').checked;
    document.getElementById('timerDisplay').style.display = isTimerMode ? 'block' : 'none';
    document.getElementById('timerConfig').style.display = isTimerMode ? 'block' : 'none';
    updateTimerValue();
    restart();
}

function startGlobalTimer() {
    clearInterval(globalTimerInterval);
    if (!isTimerMode || visibleQs.length === 0) return;
    let timeLeft = visibleQs.length * timerValue;
    const display = document.getElementById('timerDisplay');
    display.style.display = 'block';
    const tick = () => {
        const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
        display.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    };
    tick();
    globalTimerInterval = setInterval(() => {
        timeLeft--;
        tick();
        if (timeLeft <= 0) { clearInterval(globalTimerInterval); showSummary(); }
    }, 1000);
}

function toggleFocusMode() { document.body.classList.toggle('focus-mode'); }

function renderAll() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    container.innerHTML = '';
    document.getElementById('totalNum').textContent = visibleQs.length;
    if (visibleQs.length > 0) {
        visibleQs.forEach((q, i) => container.appendChild(buildCard(q, i)));
        startGlobalTimer();
        document.getElementById('finishBtn').style.display = 'block';
        
        if (document.getElementById('cheatSheetToggle').checked) {
            toggleCheatSheet();
        }
    } else {
        document.getElementById('finishBtn').style.display = 'none';
        showSummary();
    }
    updateProgress();
}

function buildCard(q, idx) {
    const card = document.createElement('div');
    card.className = 'q-card';
    card.id = `card-${idx}`;
    const optsHTML = q.currentOpts.map((o, i) => `
        <button class="option-btn" onclick="answer(${idx},${i})" id="opt-${idx}-${i}">
            <span class="option-key">${['A','B','C','D','E'][i]}</span><span>${o}</span>
        </button>`).join('');
    
    // Validar si tiene categoria, para no lanzar error
    const catText = q.cat ? q.cat.toUpperCase() : 'GENERAL';
    
    card.innerHTML = `
        <div class="q-header">
            <span class="q-num">CASO · ${catText}</span>
            <span class="q-text">${q.q}</span>
        </div>
        <div class="options">${optsHTML}</div>
        <div class="hint-wrapper" style="${isExamMode ? 'display:none' : ''}">
            <button class="hint-btn" onclick="toggleHint(${idx})"><span>💡</span> Pista</button>
            <div class="hint-box" id="hint-${idx}" style="display:none;">${q.hint || ''}</div>
        </div>
        <div class="feedback" id="fb-${idx}"></div>`;
    return card;
}

function answer(idx, chosen) {
    const q = visibleQs[idx];
    const card = document.getElementById(`card-${idx}`);
    if (!card || card.dataset.done) return;
    card.dataset.done = '1';
    const isCorrect = chosen === q.currentAns;
    
    if (q.cat && categoryStats[q.cat]) {
        categoryStats[q.cat].total++;
        if (isCorrect) categoryStats[q.cat].correct++;
    }

    updateMasteryUI();
    if (!isExamMode) {
        const fb = document.getElementById(`fb-${idx}`);
        if (isCorrect) {
            correct++;
            fb.className = 'feedback correct';
            fb.innerHTML = `<strong>✓ CORRECTO</strong><br>${q.just || ''}`;
            card.classList.add('answered-correct');
        } else {
            fb.className = 'feedback wrong';
            fb.innerHTML = `<strong>✗ INCORRECTO · RESPUESTA ${['A','B','C','D','E'][q.currentAns]}</strong><br>${q.just || ''}`;
            card.classList.add('answered-wrong');
            if (!failedQuestions.some(f => f.q === q.q)) failedQuestions.push(q);
        }
        fb.style.display = 'block';
    } else {
        if (isCorrect) correct++;
        else if (!failedQuestions.some(f => f.q === q.q)) failedQuestions.push(q);
        card.classList.add('answered-exam');
        const btn = document.getElementById(`opt-${idx}-${chosen}`);
        if (btn) btn.style.borderColor = 'var(--accent)';
    }
    answered++;
    document.getElementById('scoreDisplay').textContent = correct;
    actualizarBotonRepaso();
    updateProgress();
    if (isCorrect) {
        setTimeout(() => {
            card.classList.add('hide-card');
            setTimeout(() => card.style.display = 'none', 600);
        }, 5000);
    }
    if (answered === visibleQs.length) setTimeout(showSummary, 1000);
}

function showSummary() {
    clearInterval(globalTimerInterval);
    const summary = document.getElementById('summary');
    const report = document.getElementById('diagnosticReport');
    const finishBtn = document.getElementById('finishBtn');
    if (!summary) return;
    if (finishBtn) finishBtn.style.display = 'none';
    summary.style.display = 'block';
    report.innerHTML = '';
    const labels = { algoritmos: 'Algoritmos', estructuras: 'Estructuras', redes: 'Redes', bd: 'Bases de Datos', patrones: 'Patrones', sintaxis: 'Sintaxis C', punteros: 'Punteros', memoria: 'Memoria' };
    Object.keys(categoryStats).forEach(cat => {
        const s = categoryStats[cat];
        if (s.total === 0) return;
        const pct = (s.correct / s.total) * 100;
        const advice = pct >= 90 ? "Dominio experto. Mantén el repaso."
            : pct >= 70 ? "Buen nivel. Revisa los errores específicos."
            : "Nivel crítico. Refuerza la bibliografía base.";
        report.innerHTML += `
            <div class="diag-item">
                <span class="diag-category">${labels[cat] || cat} (${Math.round(pct)}%)</span>
                <p>${advice}</p>
            </div>`;
    });
    document.getElementById('statCorrect').textContent = correct;
    document.getElementById('statWrong').textContent = answered - correct;
    document.getElementById('statPct').textContent = Math.round((correct / Math.max(1, answered)) * 100) + '%';
    summary.scrollIntoView({ behavior: 'smooth' });
}

function exportSession() {
    const data = { fecha: new Date().toISOString(), puntaje: correct, total: answered, analitica: categoryStats };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `DevQuest_${Date.now()}.json` });
    a.click();
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function manualShuffle() { shuffle(QUESTIONS); restart(); }

function prepareVisibleQuestions() {
    const pool = isReviewMode ? [...failedQuestions] : [...QUESTIONS];
    const filtered = pool.filter(q => currentFilter === 'all' || q.cat === currentFilter);
    visibleQs = filtered.map(q => {
        const opts = q.opts.map((text, i) => ({ text, isCorrect: i === q.ans }));
        shuffle(opts);
        return { ...q, currentOpts: opts.map(o => o.text), currentAns: opts.findIndex(o => o.isCorrect) };
    });
}

function filterCat(cat, btn) {
    currentFilter = cat; isReviewMode = false; restart();
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function restart() {
    answered = 0; correct = 0;
    clearInterval(globalTimerInterval);
    document.getElementById('summary').style.display = 'none';
    Object.keys(categoryStats).forEach(c => categoryStats[c] = { correct: 0, total: 0 });
    updateMasteryUI();
    document.getElementById('searchInput').value = '';
    prepareVisibleQuestions();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
    const pct = visibleQs.length > 0 ? (answered / visibleQs.length) * 100 : 0;
    document.getElementById('progressBar').style.width = `${pct}%`;
    document.getElementById('progressNum').textContent = answered;
}

function actualizarBotonRepaso() {
    const btn = document.getElementById('reviewBtn');
    btn.style.display = failedQuestions.length > 0 ? 'block' : 'none';
    document.getElementById('errorCount').textContent = failedQuestions.length;
}

function toggleHint(idx) {
    const h = document.getElementById(`hint-${idx}`);
    h.style.display = h.style.display === 'none' ? 'block' : 'none';
}

function reviewErrors() { isReviewMode = true; restart(); }

async function loadRepo() {
    const input = document.getElementById('repoInput').value.trim();
    if (!input.includes('/')) {
        setRepoStatus('error', 'Formato inválido. Usa: usuario/repositorio');
        return;
    }
    const [owner, repo] = input.split('/');
    ghOwner = owner; ghRepo = repo; fileCache = {};
    setRepoStatus('loading', 'Cargando repositorio...');
    try {
        const data = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/`);
        const tree = document.getElementById('fileTree');
        renderFileTree(data, tree);
        document.getElementById('fileTreeSection').style.display = 'block';
        document.getElementById('repoLabel').textContent = repo;
        setRepoStatus('success', `✓ ${owner}/${repo}`);
    } catch (e) {
        setRepoStatus('error', 'No encontrado o repositorio privado.');
    }
}

async function ghFetch(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    return res.json();
}

function renderFileTree(items, container) {
    container.innerHTML = '';
    const sorted = [...items].sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
    });
    sorted.forEach(item => {
        if (item.type === 'dir') {
            const wrapper = document.createElement('div');
            wrapper.className = 'tree-dir-wrapper';
            const row = document.createElement('div');
            row.className = 'tree-item tree-dir';
            row.innerHTML = `<span class="tree-icon">📁</span><span class="tree-name">${item.name}/</span>`;
            const children = document.createElement('div');
            children.className = 'tree-children';
            children.style.display = 'none';
            let loaded = false;
            row.onclick = async () => {
                const open = children.style.display !== 'none';
                if (open) {
                    children.style.display = 'none';
                    row.querySelector('.tree-icon').textContent = '📁';
                } else {
                    if (!loaded) {
                        row.classList.add('loading');
                        try {
                            const data = await ghFetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${item.path}`);
                            renderFileTree(data, children);
                            loaded = true;
                        } catch {}
                        row.classList.remove('loading');
                    }
                    children.style.display = 'block';
                    row.querySelector('.tree-icon').textContent = '📂';
                }
            };
            wrapper.appendChild(row);
            wrapper.appendChild(children);
            container.appendChild(wrapper);
        } else {
            const el = document.createElement('div');
            el.className = 'tree-item tree-file';
            el.innerHTML = `<span class="tree-icon">${fileIcon(item.name)}</span><span class="tree-name">${item.name}</span>`;
            el.onclick = () => openFile(item);
            container.appendChild(el);
        }
    });
}

function fileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    return { js:'🟨', ts:'🔷', jsx:'🟨', tsx:'🔷', py:'🐍', java:'☕', html:'🌐', css:'🎨', scss:'🎨', json:'📋', md:'📝', sql:'🗄️', sh:'⚡', yml:'⚙️', yaml:'⚙️', cpp:'🔧', c:'🔧', cs:'💜', go:'🐹', rb:'💎', php:'🐘', rs:'🦀', kt:'🔵', swift:'🍎', dart:'🎯', env:'🔒', gitignore:'🙈', dockerfile:'🐳' }[ext] || '📄';
}

async function openFile(item) {
    const ext = item.name.split('.').pop().toLowerCase();
    const binary = ['png','jpg','jpeg','gif','svg','ico','woff','woff2','ttf','eot','pdf','zip','tar','gz','exe','bin'];
    if (binary.includes(ext)) {
        document.getElementById('codeEmpty').style.display = 'none';
        document.getElementById('codeContent').style.display = 'block';
        document.getElementById('fileBreadcrumb').textContent = item.path;
        document.getElementById('fileGithubLink').href = `https://github.com/${ghOwner}/${ghRepo}/blob/main/${item.path}`;
        const cb = document.getElementById('codeBlock');
        cb.className = ''; cb.textContent = '[Archivo binario · No se puede previsualizar en texto]';
        return;
    }
    document.getElementById('codeEmpty').style.display = 'none';
    document.getElementById('codeContent').style.display = 'block';
    document.getElementById('fileBreadcrumb').textContent = item.path;
    document.getElementById('fileGithubLink').href = `https://github.com/${ghOwner}/${ghRepo}/blob/main/${item.path}`;
    const codeBlock = document.getElementById('codeBlock');
    codeBlock.className = ''; codeBlock.textContent = 'Cargando...';
    try {
        let content;
        if (fileCache[item.path]) {
            content = fileCache[item.path];
        } else {
            const data = await ghFetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${item.path}`);
            if (data.encoding === 'none' || data.size > 500000) {
                codeBlock.textContent = '[Archivo demasiado grande para previsualizar]';
                return;
            }
            content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
            fileCache[item.path] = content;
        }
        const langMap = { js:'javascript', ts:'typescript', jsx:'javascript', tsx:'typescript', py:'python', java:'java', html:'html', css:'css', scss:'css', json:'json', md:'markdown', sql:'sql', sh:'bash', bash:'bash', yml:'yaml', yaml:'yaml', cpp:'cpp', c:'c', cs:'csharp', go:'go', rb:'ruby', php:'php', rs:'rust', kt:'kotlin', swift:'swift', dart:'dart' };
        const lang = langMap[ext] || 'plaintext';
        codeBlock.className = `language-${lang}`;
        codeBlock.textContent = content;
        hljs.highlightElement(codeBlock);
        addToRecent(item);
    } catch (e) {
        codeBlock.textContent = `Error al cargar: ${e.message}`;
    }
}

function addToRecent(item) {
    recentFiles = [item, ...recentFiles.filter(f => f.path !== item.path)].slice(0, 6);
    const container = document.getElementById('recentFiles');
    container.innerHTML = '';
    recentFiles.forEach(f => {
        const el = document.createElement('div');
        el.className = 'recent-item';
        el.innerHTML = `<span>${fileIcon(f.name)}</span><span>${f.name}</span>`;
        el.onclick = () => openFile(f);
        container.appendChild(el);
    });
    document.getElementById('recentFilesSection').style.display = 'block';
}

function copyCode() {
    const code = document.getElementById('codeBlock').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = '✓ COPIADO';
        setTimeout(() => btn.textContent = '📋 COPIAR', 2000);
    });
}

function setRepoStatus(type, msg) {
    const el = document.getElementById('repoStatus');
    el.textContent = msg; el.className = `repo-status ${type}`;
}

// Atajos de teclado 
document.addEventListener('keydown', (e) => {
    if (document.body.dataset.mode !== 'quiz' || (isReviewMode && answered === visibleQs.length)) return;
    
    const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4 };
    const key = e.key.toLowerCase();
    
    if (keyMap[key] !== undefined) {
        const activeCard = document.querySelector('.q-card:not([data-done="1"])');
        if (activeCard) {
            const cardId = activeCard.id.split('-')[1];
            const btn = document.getElementById(`opt-${cardId}-${keyMap[key]}`);
            if (btn) btn.click();
        }
    }
});

window.addEventListener('beforeunload', (e) => {
    clearInterval(globalTimerInterval);
    if (answered > 0 && answered < visibleQs.length && document.body.dataset.mode === 'quiz') {
        e.preventDefault();
        e.returnValue = '';
    }
});

init();