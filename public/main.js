// ─── CONFIG ────────────────────────────────────────────
const API = ''; // Vazio = mesmo domínio. Em dev separado use 'http://localhost:3000'

// ─── STATE ─────────────────────────────────────────────
let token = null;
let currentUser = null; // { id, nome, email }
let favorites = [];     // [{ id, filmeId, titulo, poster, watched, criadoEm }]
let currentFilter = 'all';
let debounceTimer = null;

// ─── UTILS ─────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2800);
}

function setLoading(btnEl, loading) {
    if (loading) {
        btnEl.dataset.original = btnEl.innerHTML;
        btnEl.textContent = '...';
        btnEl.disabled = true;
    } else {
        btnEl.innerHTML = btnEl.dataset.original || btnEl.innerHTML;
        btnEl.disabled = false;
    }
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

function saveSession() {
    localStorage.setItem('cinerama_token', token);
    localStorage.setItem('cinerama_user', JSON.stringify(currentUser));
}

function clearSession() {
    localStorage.removeItem('cinerama_token');
    localStorage.removeItem('cinerama_user');
    token = null;
    currentUser = null;
    favorites = [];
}

// ─── AUTH API ───────────────────────────────────────────
async function apiLogin(email, senha) {
    const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
    return data;
}

async function apiRegister(nome, email, senha) {
    const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');
    return data;
}

// ─── FAVORITOS API ──────────────────────────────────────
async function apiFetchFavoritos() {
    const res = await fetch(`${API}/api/favoritos/${currentUser.id}`, {
        headers: authHeaders(),
    });
    if (res.status === 401 || res.status === 403) throw new Error('Token inválido');
    if (!res.ok) throw new Error('Erro ao buscar favoritos');
    return res.json();
}

async function apiAddFavorito(tmdbId, titulo, poster) {
    const res = await fetch(`${API}/api/favoritos`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            usuarioId: currentUser.id,
            filmeId: tmdbId,
            titulo: titulo.trim(),
            poster: poster || null,
        }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao adicionar');
    return data;
}

async function apiToggleWatched(id) {
    const res = await fetch(`${API}/api/favoritos/${id}/watched`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar');
    return data; // favorito atualizado com novo valor de watched
}

async function apiRemoveFavorito(id) {
    const res = await fetch(`${API}/api/favoritos/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao remover');
    }
}

// ─── DOM READY ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            document.getElementById('login-error').textContent = '';
            document.getElementById('reg-error').textContent = '';
        });
    });

    // LOGIN
    document.getElementById('btn-login').addEventListener('click', async () => {
        const btn   = document.getElementById('btn-login');
        const email = document.getElementById('login-email').value.trim();
        const senha = document.getElementById('login-password').value;
        const errEl = document.getElementById('login-error');
        if (!email || !senha) { errEl.textContent = 'Preencha todos os campos.'; return; }
        setLoading(btn, true);
        try {
            const data = await apiLogin(email, senha);
            token = data.token;
            currentUser = { id: data.id, nome: data.nome, email };
            saveSession();
            errEl.textContent = '';
            await startSession();
        } catch (err) {
            errEl.textContent = err.message;
        } finally {
            setLoading(btn, false);
        }
    });

    // REGISTER
    document.getElementById('btn-register').addEventListener('click', async () => {
        const btn   = document.getElementById('btn-register');
        const nome  = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const senha = document.getElementById('reg-password').value;
        const errEl = document.getElementById('reg-error');
        if (!nome || !email || !senha) { errEl.textContent = 'Preencha todos os campos.'; return; }
        setLoading(btn, true);
        try {
            const data = await apiRegister(nome, email, senha);
            token = data.token;
            currentUser = { id: data.id, nome: data.nome, email };
            saveSession();
            errEl.textContent = '';
            await startSession();
            showToast(`Bem-vindo, ${nome}! 🎬`);
        } catch (err) {
            errEl.textContent = err.message;
        } finally {
            setLoading(btn, false);
        }
    });

    // Enter key
    ['login-email', 'login-password'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('btn-login').click();
        });
    });
    ['reg-name', 'reg-email', 'reg-password'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('btn-register').click();
        });
    });

    // Fechar autocomplete ao clicar fora — registrado UMA vez aqui
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.add-input-wrap')) {
            document.getElementById('search-results')?.classList.add('hidden');
        }
    });

    // Auto-login
    const savedToken = localStorage.getItem('cinerama_token');
    const savedUser  = localStorage.getItem('cinerama_user');
    if (savedToken && savedUser) {
        token = savedToken;
        currentUser = JSON.parse(savedUser);
        startSession();
    }
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession();
    currentFilter = 'all';
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('app').classList.add('hidden');
    ['login-email', 'login-password', 'reg-name', 'reg-email', 'reg-password'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('login-error').textContent = '';
    document.getElementById('movie-search').value = '';
    document.getElementById('search-results').classList.add('hidden');
});

// ─── SESSION ────────────────────────────────────────────
async function startSession() {
    document.getElementById('user-name-display').textContent = currentUser.nome;
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');

    try {
        favorites = await apiFetchFavoritos();
    } catch (err) {
        if (err.message.includes('Token') || err.message.includes('inválido')) {
            handleSessionExpired();
            return;
        }
        favorites = [];
        showToast('Não foi possível carregar seus favoritos.', 'error');
    }

    initApp();
}

function handleSessionExpired() {
    clearSession();
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-error').textContent = 'Sessão expirada. Faça login novamente.';
}

// ─── APP ────────────────────────────────────────────────
function initApp() {
    // Resetar filtro visual
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.filter-btn[data-filter="${currentFilter}"]`)?.classList.add('active');

    renderGrid();
    updateCount();

    // Input de busca — re-atribui handler sem clonar (evita perder referência ao search-results)
    const searchInput = document.getElementById('movie-search');
    searchInput.value = '';
    searchInput.oninput = handleSearchInput;

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderGrid();
        };
    });
}

// ─── TMDB AUTOCOMPLETE ──────────────────────────────────
function handleSearchInput(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('search-results');

    if (query.length < 3) {
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        try {
            const res = await fetch(`${API}/api/filmes/search?q=${encodeURIComponent(query)}`, {
                headers: authHeaders(),
            });
            if (!res.ok) throw new Error();
            const filmes = await res.json();
            renderSearchResults(filmes);
        } catch {
            // Silencia erro de rede no autocomplete
        }
    }, 500);
}

function renderSearchResults(filmes) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    if (filmes.length === 0) {
        resultsContainer.innerHTML = `
            <li class="search-result-item no-results">
                <div class="search-result-info">
                    <span class="search-result-title">Nenhum filme encontrado</span>
                </div>
            </li>`;
        resultsContainer.classList.remove('hidden');
        return;
    }

    filmes.forEach(filme => {
        const li = document.createElement('li');
        li.className = 'search-result-item';

        const posterImg = filme.poster
            ? `<img src="${filme.poster}" class="search-result-poster" alt="">`
            : `<div class="search-result-poster no-poster">🎬</div>`;

        li.innerHTML = `
            ${posterImg}
            <div class="search-result-info">
                <span class="search-result-title">${filme.titulo}</span>
                <span class="search-result-year">${filme.ano || ''}</span>
            </div>
        `;

        li.addEventListener('click', async () => {
            resultsContainer.classList.add('hidden');
            document.getElementById('movie-search').value = '';

            if (favorites.some(f => f.filmeId === filme.tmdbId)) {
                showToast('Esse filme já está na sua lista.', 'warn');
                return;
            }

            try {
                const novo = await apiAddFavorito(filme.tmdbId, filme.titulo, filme.poster);
                favorites.unshift(novo);
                renderGrid();
                updateCount();
                showToast(`"${filme.titulo}" adicionado ✓`);
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

        resultsContainer.appendChild(li);
    });

    resultsContainer.classList.remove('hidden');
}

// ─── AÇÕES DOS CARDS ────────────────────────────────────
async function toggleWatched(id) {
    try {
        const atualizado = await apiToggleWatched(id);
        const idx = favorites.findIndex(f => f.id === id);
        if (idx !== -1) favorites[idx] = atualizado;
        renderGrid();
        updateCount();
        showToast(atualizado.watched ? 'Marcado como assistido ✓' : 'Desmarcado');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function removeFavorito(id) {
    const fav = favorites.find(f => f.id === id);
    try {
        await apiRemoveFavorito(id);
        favorites = favorites.filter(f => f.id !== id);
        renderGrid();
        updateCount();
        if (fav) showToast(`"${fav.titulo}" removido`);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── RENDER ─────────────────────────────────────────────
function updateCount() {
    const total   = favorites.length;
    const watched = favorites.filter(f => f.watched).length;
    const el = document.getElementById('movie-count');
    if (total === 0) {
        el.textContent = '0 filmes';
    } else {
        el.textContent = `${total} ${total === 1 ? 'filme' : 'filmes'} · ${watched} assistido${watched !== 1 ? 's' : ''}`;
    }
}

function getFiltered() {
    if (currentFilter === 'watched') return favorites.filter(f => f.watched);
    if (currentFilter === 'pending') return favorites.filter(f => !f.watched);
    return favorites;
}

function renderGrid() {
    const grid  = document.getElementById('movie-grid');
    const empty = document.getElementById('empty-state');
    const list  = getFiltered();

    grid.innerHTML = '';

    if (list.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    list.forEach((fav, i) => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.animationDelay = `${Math.min(i * 40, 400)}ms`;

        const posterHtml = fav.poster
            ? `<img src="${fav.poster}" alt="${fav.titulo}" class="movie-poster"
                   onerror="this.outerHTML='<div class=\\'poster-placeholder\\'><span>🎬</span><span>${fav.titulo}</span></div>'">`
            : `<div class="poster-placeholder">
                 <span style="font-size:2rem;opacity:0.2">🎬</span>
                 <span>${fav.titulo}</span>
               </div>`;

        const watchedBadge = fav.watched
            ? `<div class="watched-badge">Assistido</div>` : '';

        card.innerHTML = `
            <div class="movie-poster-wrap">
                ${posterHtml}
                ${watchedBadge}
                <div class="card-overlay">
                    <button class="btn-watch ${fav.watched ? 'watched' : ''}" data-id="${fav.id}">
                        ${fav.watched ? '✓ Assistido' : 'Marcar'}
                    </button>
                    <button class="btn-remove" data-id="${fav.id}" title="Remover">✕</button>
                </div>
            </div>
            <div class="movie-info">
                <p class="movie-title" title="${fav.titulo}">${fav.titulo}</p>
            </div>
        `;

        card.querySelector('.btn-watch').addEventListener('click', e => {
            e.stopPropagation();
            toggleWatched(fav.id);
        });

        card.querySelector('.btn-remove').addEventListener('click', e => {
            e.stopPropagation();
            removeFavorito(fav.id);
        });

        grid.appendChild(card);
    });
}