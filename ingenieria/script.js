/* ═══════════════════════════════════════════
   DEVQUEST · script.js
   Quiz engine + GitHub Code Viewer
═══════════════════════════════════════════ */

// ─── QUIZ STATE ───────────────────────────
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

// ─── GITHUB STATE ─────────────────────────
let ghOwner = '';
let ghRepo = '';
let fileCache = {};
let recentFiles = [];

// ─── FALLBACK QUESTIONS ───────────────────
// Se usan si los archivos data/*.json no existen aún.
// Misma estructura que medicina: { q, opts, ans, cat, hint, just }
const FALLBACK = [
  // ALGORITMOS
  { q: "¿Cuál es la complejidad temporal promedio de QuickSort?", opts: ["O(n²)", "O(n log n)", "O(log n)", "O(n)"], ans: 1, cat: "algoritmos", hint: "Divide el arreglo en torno a un pivote en cada recursión.", just: "QuickSort tiene complejidad O(n log n) en promedio. Su peor caso es O(n²) cuando el pivote es siempre el extremo, pero en la práctica es uno de los algoritmos de ordenamiento más eficientes." },
  { q: "¿Qué algoritmo de búsqueda requiere que el arreglo esté previamente ordenado?", opts: ["Búsqueda lineal", "Búsqueda binaria", "BFS", "DFS"], ans: 1, cat: "algoritmos", hint: "Descarta la mitad del espacio de búsqueda en cada paso.", just: "La búsqueda binaria requiere datos ordenados y opera en O(log n), comparando el elemento central para eliminar la mitad del arreglo en cada iteración." },
  { q: "¿Cuál es la complejidad de un algoritmo con dos bucles anidados que iteran n veces cada uno?", opts: ["O(n)", "O(log n)", "O(n²)", "O(2n)"], ans: 2, cat: "algoritmos", hint: "Multiplica las iteraciones de cada bucle.", just: "Dos bucles anidados con n iteraciones cada uno producen n × n = n² operaciones. Ejemplos clásicos: Bubble Sort y Selection Sort." },
  { q: "¿Qué estructura de datos usa BFS (Búsqueda en Amplitud) internamente?", opts: ["Pila", "Cola", "Árbol AVL", "Heap binario"], ans: 1, cat: "algoritmos", hint: "Procesa nodos nivel por nivel, sin retroceder.", just: "BFS utiliza una cola (FIFO) para explorar todos los nodos a distancia k antes de pasar a los de distancia k+1, garantizando el camino más corto en grafos no ponderados." },
  { q: "¿Qué paradigma usa la programación dinámica para optimizar su solución?", opts: ["Divide y vencerás", "Memoización de subproblemas", "Búsqueda exhaustiva", "Programación lineal"], ans: 1, cat: "algoritmos", hint: "Recuerda resultados ya calculados para no repetirlos.", just: "La programación dinámica resuelve subproblemas solapados una sola vez y almacena sus resultados (memoización o tabulación), reduciendo exponencialmente la complejidad respecto a la recursión pura." },

  // ESTRUCTURAS DE DATOS
  { q: "¿Qué principio de operación sigue una pila (Stack)?", opts: ["FIFO", "LIFO", "LILO", "FILO"], ans: 1, cat: "estructuras", hint: "Piensa en una pila de platos: el último en llegar es el primero en salir.", just: "Una pila sigue LIFO (Last In, First Out). Es fundamental en la gestión del call stack, evaluación de expresiones y algoritmos de backtracking." },
  { q: "¿Cuál es la complejidad de búsqueda en un árbol AVL balanceado?", opts: ["O(n)", "O(n²)", "O(log n)", "O(1)"], ans: 2, cat: "estructuras", hint: "El árbol mantiene su altura logarítmica mediante rotaciones automáticas.", just: "Un árbol AVL garantiza búsqueda, inserción y eliminación en O(log n) al mantener el factor de balance (diferencia de alturas ≤ 1) mediante rotaciones simples y dobles." },
  { q: "¿Qué estructura de datos permite acceso O(1) promedio en búsqueda, inserción y eliminación?", opts: ["Array dinámico", "Lista enlazada", "Tabla hash", "Árbol BST"], ans: 2, cat: "estructuras", hint: "Usa una función de dispersión para mapear claves a índices.", just: "Una tabla hash mapea claves a índices mediante una función hash, logrando O(1) promedio. El peor caso es O(n) debido a colisiones, mitigadas con encadenamiento o direccionamiento abierto." },
  { q: "En una lista doblemente enlazada, ¿cuál es la complejidad de inserción al inicio?", opts: ["O(n)", "O(log n)", "O(n²)", "O(1)"], ans: 3, cat: "estructuras", hint: "No requiere recorrer la lista, solo actualizar punteros.", just: "La inserción al inicio de una lista doblemente enlazada es O(1) porque únicamente se actualizan los punteros del nuevo nodo y del nodo que era cabeza anteriormente." },
  { q: "¿Qué propiedad define a un montículo máximo (Max Heap)?", opts: ["El nodo raíz es el menor elemento", "El nodo raíz es el mayor elemento", "Todos los nodos hoja están al mismo nivel", "Es un árbol AVL balanceado"], ans: 1, cat: "estructuras", hint: "El elemento prioritario siempre está arriba.", just: "En un Max Heap, cada nodo padre es mayor o igual a sus hijos, por lo que la raíz contiene siempre el valor máximo. Se usa en colas de prioridad y en el algoritmo HeapSort." },

  // REDES
  { q: "¿En qué capa del modelo OSI opera el protocolo HTTP?", opts: ["Capa 3 · Red", "Capa 4 · Transporte", "Capa 6 · Presentación", "Capa 7 · Aplicación"], ans: 3, cat: "redes", hint: "Es el protocolo del navegador web.", just: "HTTP opera en la Capa 7 (Aplicación) del modelo OSI. Define la sintaxis y semántica del intercambio de hipertexto entre clientes y servidores web." },
  { q: "¿Cuál es la principal diferencia entre TCP y UDP?", opts: ["TCP es más rápido que UDP en todos los casos", "TCP garantiza entrega y orden; UDP no", "UDP usa más ancho de banda que TCP", "TCP no requiere handshake de conexión"], ans: 1, cat: "redes", hint: "Uno prioriza confiabilidad; el otro, velocidad.", just: "TCP establece conexión mediante three-way handshake y garantiza entrega ordenada y sin errores. UDP no garantiza entrega ni orden, siendo preferido en streaming, gaming y DNS por su baja latencia." },
  { q: "¿Qué código HTTP indica que un recurso fue creado exitosamente?", opts: ["200 OK", "201 Created", "204 No Content", "301 Moved"], ans: 1, cat: "redes", hint: "Respuesta típica de un POST exitoso.", just: "El código 201 Created indica que la solicitud se procesó y generó un nuevo recurso. Se retorna frecuentemente en respuestas a métodos POST o PUT que crean entidades." },
  { q: "¿Qué significa REST en el contexto de APIs web?", opts: ["Real-time Event Streaming Technology", "Representational State Transfer", "Remote Execution Service Template", "Relational Endpoint Standard Transfer"], ans: 1, cat: "redes", hint: "Define un estilo arquitectónico sin estado para la web.", just: "REST (Representational State Transfer) es un estilo arquitectónico que usa los métodos HTTP estándar (GET, POST, PUT, DELETE) sobre recursos identificados por URIs, sin mantener estado en el servidor entre peticiones." },

  // BASES DE DATOS
  { q: "¿Qué propiedad ACID garantiza que una transacción se ejecuta por completo o no se ejecuta en absoluto?", opts: ["Consistency", "Isolation", "Atomicity", "Durability"], ans: 2, cat: "bd", hint: "Todo o nada, sin estados intermedios visibles.", just: "Atomicity (Atomicidad) trata la transacción como una unidad indivisible: si cualquier operación falla, todas se revierten (rollback). Evita dejar la base de datos en un estado inconsistente." },
  { q: "¿Qué tipo de JOIN devuelve únicamente las filas que tienen coincidencia en ambas tablas?", opts: ["LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "INNER JOIN"], ans: 3, cat: "bd", hint: "Excluye todos los registros sin pareja en la otra tabla.", just: "INNER JOIN retorna solo las filas donde existe la condición de unión en ambas tablas, descartando los registros sin coincidencia de cualquier lado." },
  { q: "¿Qué tipo de base de datos NoSQL almacena datos en pares clave-valor?", opts: ["Orientada a documentos", "Grafos", "Key-Value Store", "Columnar"], ans: 2, cat: "bd", hint: "Redis y DynamoDB son ejemplos populares.", just: "Un Key-Value Store asocia claves únicas a valores arbitrarios, logrando acceso O(1). Son ideales para caché, sesiones de usuario y configuraciones. Ejemplos: Redis, Memcached, DynamoDB." },
  { q: "¿Qué es la normalización en bases de datos relacionales?", opts: ["Optimizar consultas SQL con índices", "Eliminar redundancias organizando datos en tablas relacionadas", "Cifrar datos sensibles en columnas", "Distribuir datos en múltiples servidores"], ans: 1, cat: "bd", hint: "Reduce la duplicación de datos y dependencias anómalas.", just: "La normalización organiza datos en tablas mediante formas normales (1FN, 2FN, 3FN, BCNF) para eliminar redundancias y anomalías de actualización, inserción y eliminación, garantizando integridad referencial." },

  // PATRONES DE DISEÑO
  { q: "¿Qué patrón garantiza que una clase tenga una única instancia accesible globalmente?", opts: ["Factory Method", "Observer", "Singleton", "Decorator"], ans: 2, cat: "patrones", hint: "Se usa típicamente para conexiones a base de datos o loggers.", just: "Singleton restringe la instanciación a un único objeto, proporcionando un punto de acceso global. Aunque resuelve la unicidad, introduce acoplamiento global y dificulta las pruebas unitarias." },
  { q: "¿Qué principio de SOLID establece que una clase debe tener una sola razón para cambiar?", opts: ["Open/Closed Principle", "Single Responsibility Principle", "Liskov Substitution Principle", "Interface Segregation Principle"], ans: 1, cat: "patrones", hint: "Una responsabilidad, un motivo de cambio.", just: "El Single Responsibility Principle (SRP) indica que cada clase debe encapsular una única responsabilidad de negocio, facilitando su mantenimiento, extensión y prueba independiente." },
  { q: "¿Qué patrón define una interfaz para crear objetos, delegando a las subclases la decisión de qué clase instanciar?", opts: ["Abstract Factory", "Factory Method", "Builder", "Prototype"], ans: 1, cat: "patrones", hint: "Define el molde de creación; las subclases lo rellenan.", just: "Factory Method define una interfaz para crear un objeto pero deja la decisión de instanciación a las subclases. Reduce el acoplamiento al eliminar la dependencia de clases concretas en el código cliente." },
  { q: "¿Qué patrón de diseño permite añadir comportamiento a un objeto en tiempo de ejecución sin modificar su clase?", opts: ["Singleton", "Observer", "Strategy", "Decorator"], ans: 3, cat: "patrones", hint: "Envuelve el objeto original con capas de funcionalidad adicional.", just: "El patrón Decorator envuelve un objeto con otro que implementa la misma interfaz, añadiendo comportamiento antes o después de delegar al objeto base. Es una alternativa flexible a la herencia para extender funcionalidades." },
];

// ─── INICIALIZACIÓN ────────────────────────
async function init() {
    const files = [
        'data/algoritmos.json', 'data/estructuras.json',
        'data/redes.json', 'data/bd.json', 'data/patrones.json'
    ];
    try {
        const results = await Promise.all(
            files.map(url => fetch(url)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null))
        );
        const loaded = results.filter(r => r && r.preguntas).flatMap(r => r.preguntas);
        QUESTIONS = loaded.length > 0 ? loaded : FALLBACK;
    } catch {
        QUESTIONS = FALLBACK;
    }
    const cats = [...new Set(QUESTIONS.map(q => q.cat))];
    cats.forEach(c => categoryStats[c] = { correct: 0, total: 0 });
    updateMasteryUI();
    prepareVisibleQuestions();
    renderAll();
}

// ─── MODE SWITCHING ────────────────────────
function switchMode(mode) {
    document.body.dataset.mode = mode;
    document.getElementById('tabQuiz').classList.toggle('active', mode === 'quiz');
    document.getElementById('tabCode').classList.toggle('active', mode === 'code');
}

// ─── MASTERY UI ────────────────────────────
function updateMasteryUI() {
    const container = document.getElementById('masteryIndex');
    if (!container) return;
    container.innerHTML = '';
    const labels = { algoritmos: 'Algoritmos', estructuras: 'Estructuras', redes: 'Redes', bd: 'BD', patrones: 'Patrones' };
    const colors = { algoritmos: 'var(--accent)', estructuras: 'var(--accent2)', redes: '#f472b6', bd: '#fb923c', patrones: '#4ade80' };
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

// ─── QUIZ FUNCTIONS ────────────────────────
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
    card.innerHTML = `
        <div class="q-header">
            <span class="q-num">CASO · ${q.cat.toUpperCase()}</span>
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
    categoryStats[q.cat].total++;
    if (isCorrect) categoryStats[q.cat].correct++;
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
    const labels = { algoritmos: 'Algoritmos', estructuras: 'Estructuras', redes: 'Redes', bd: 'Bases de Datos', patrones: 'Patrones' };
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

// ─── GITHUB CODE VIEWER ────────────────────
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
    // Archivos muy grandes o binarios
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

// ─── CLEANUP ──────────────────────────────
window.addEventListener('beforeunload', () => clearInterval(globalTimerInterval));

// ─── START ────────────────────────────────
init();