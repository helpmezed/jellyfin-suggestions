/**
 * Movie Suggestion Board v2 — Application Logic
 * TMDB-powered poster search + localStorage persistence
 */

// ───── Config ─────
const STORAGE_KEY = 'jellyfin_suggestions_v2';
const TMDB_API_KEY = ''; // Users can set their own key
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

// ───── State ─────
let suggestions = [];
let activeFilter = 'all';
let searchQuery = '';
let sortBy = 'newest';
let selectedTmdb = null; // currently selected TMDB result for the form
let searchTimeout = null;

// ───── DOM Refs ─────
const grid = document.getElementById('suggestions-grid');
const modalOverlay = document.getElementById('modal-overlay');
const form = document.getElementById('suggestion-form');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const toastContainer = document.getElementById('toast-container');
const tmdbResults = document.getElementById('tmdb-search-results');
const tmdbPreview = document.getElementById('tmdb-preview');
const titleInput = document.getElementById('field-title');

// Stats
const statTotal = document.getElementById('stat-total');
const statPending = document.getElementById('stat-pending');
const statApproved = document.getElementById('stat-approved');
const statWatched = document.getElementById('stat-watched');
const statAvailable = document.getElementById('stat-available');

// ───── Init ─────
document.addEventListener('DOMContentLoaded', () => {
  loadSuggestions();
  renderWithTransition();
  bindEvents();
  checkTmdbKey();
  checkJellyfinConfig();
});

// ───── Jellyfin Config Management ─────
function checkJellyfinConfig() {
  const url = localStorage.getItem('jellyfin_url');
  const key = localStorage.getItem('jellyfin_api_key');
  if (url && key) {
    window._JELLYFIN_URL = url;
    window._JELLYFIN_KEY = key;
  }
}

function getJellyfinConfig() {
  return {
    url: window._JELLYFIN_URL || localStorage.getItem('jellyfin_url'),
    key: window._JELLYFIN_KEY || localStorage.getItem('jellyfin_api_key')
  };
}

function hasJellyfinConfig() {
  const cfg = getJellyfinConfig();
  return !!(cfg.url && cfg.key);
}

// ───── TMDB Key Management ─────
function checkTmdbKey() {
  const saved = localStorage.getItem('tmdb_api_key');
  if (saved) {
    setTmdbKey(saved);
  }
}

function setTmdbKey(key) {
  // We store it dynamically so the const above stays empty (no hardcoding secrets)
  window._TMDB_KEY = key;
  localStorage.setItem('tmdb_api_key', key);
}

function getTmdbKey() {
  return window._TMDB_KEY || TMDB_API_KEY;
}

function hasTmdbKey() {
  return !!getTmdbKey();
}

// ───── TMDB Search ─────
async function searchTmdb(query) {
  const key = getTmdbKey();
  if (!key || !query || query.length < 2) return [];

  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
    );
    if (!res.ok) throw new Error('TMDB API error');
    const data = await res.json();
    return (data.results || []).slice(0, 8);
  } catch (err) {
    console.warn('TMDB search failed:', err);
    return [];
  }
}

function renderTmdbResults(results) {
  if (!results.length) {
    tmdbResults.classList.remove('show');
    return;
  }

  tmdbResults.innerHTML = results
    .map(
      (r) => `
    <div class="tmdb-result-item" data-tmdb-id="${r.id}">
      <img src="${r.poster_path ? `${TMDB_IMG}/w92${r.poster_path}` : ''}"
           alt="" onerror="this.style.display='none'" />
      <div class="tmdb-result-info">
        <div class="tmdb-result-title">${escapeHtml(r.title)}</div>
        <div class="tmdb-result-year">${r.release_date ? r.release_date.substring(0, 4) : 'N/A'}</div>
      </div>
      ${r.vote_average ? `<div class="tmdb-result-rating">⭐ ${r.vote_average.toFixed(1)}</div>` : ''}
    </div>`
    )
    .join('');

  tmdbResults.classList.add('show');

  // Bind click on each result
  tmdbResults.querySelectorAll('.tmdb-result-item').forEach((item) => {
    item.addEventListener('click', () => {
      const tmdbId = parseInt(item.dataset.tmdbId);
      const movie = results.find((r) => r.id === tmdbId);
      if (movie) selectTmdbMovie(movie);
    });
  });
}

async function selectTmdbMovie(movie) {
  tmdbResults.classList.remove('show');

  // Fetch full details for genres
  let genres = [];
  const key = getTmdbKey();
  if (key) {
    try {
      const res = await fetch(`${TMDB_BASE}/movie/${movie.id}?api_key=${encodeURIComponent(key)}&language=en-US`);
      if (res.ok) {
        const detail = await res.json();
        genres = (detail.genres || []).map((g) => g.name);
      }
    } catch {}
  }

  selectedTmdb = {
    id: movie.id,
    title: movie.title,
    year: movie.release_date ? movie.release_date.substring(0, 4) : '',
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    overview: movie.overview || '',
    rating: movie.vote_average || 0,
    genres: genres.length ? genres : guessGenres(movie.genre_ids),
  };

  // Fill form
  titleInput.value = selectedTmdb.title;
  const yearInput = document.getElementById('field-year');
  if (yearInput) yearInput.value = selectedTmdb.year;

  // Show preview
  showTmdbPreview();
}

function guessGenres(genreIds) {
  const map = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  };
  return (genreIds || []).map((id) => map[id] || '').filter(Boolean);
}

function showTmdbPreview() {
  if (!selectedTmdb) return;

  const posterUrl = selectedTmdb.posterPath ? `${TMDB_IMG}/w154${selectedTmdb.posterPath}` : '';

  tmdbPreview.innerHTML = `
    ${posterUrl ? `<img src="${posterUrl}" alt="${escapeHtml(selectedTmdb.title)}" />` : ''}
    <div class="tmdb-preview-info">
      <div class="preview-title">${escapeHtml(selectedTmdb.title)}</div>
      <div class="preview-meta">
        ${selectedTmdb.year} ${selectedTmdb.rating ? `· <span>⭐ ${selectedTmdb.rating.toFixed(1)}</span>` : ''}
        ${selectedTmdb.genres.length ? `· ${selectedTmdb.genres.slice(0, 3).join(', ')}` : ''}
      </div>
      ${selectedTmdb.overview ? `<div class="preview-overview">${escapeHtml(selectedTmdb.overview)}</div>` : ''}
    </div>
    <button type="button" class="btn-clear-preview" onclick="clearTmdbSelection()">✕</button>
  `;
  tmdbPreview.classList.add('show');
}

function clearTmdbSelection() {
  selectedTmdb = null;
  tmdbPreview.classList.remove('show');
  tmdbPreview.innerHTML = '';
  titleInput.value = '';
  titleInput.focus();
}

// ───── Persistence ─────
function loadSuggestions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    suggestions = raw ? JSON.parse(raw) : [];
  } catch {
    suggestions = [];
  }
}

function saveSuggestions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suggestions));
}

// ───── CRUD ─────
function addSuggestion({ title, year, genre, note, submitter, tmdb }) {
  const suggestion = {
    id: crypto.randomUUID(),
    title: title.trim(),
    year: year ? year.trim() : '',
    genre: genre || '',
    note: note ? note.trim() : '',
    submitter: submitter ? submitter.trim() : 'Anonymous',
    votes: 0,
    votedBy: [],
    status: 'pending',
    createdAt: new Date().toISOString(),
    // TMDB enrichment
    tmdbId: tmdb?.id || null,
    posterPath: tmdb?.posterPath || null,
    backdropPath: tmdb?.backdropPath || null,
    overview: tmdb?.overview || '',
    rating: tmdb?.rating || 0,
    genres: tmdb?.genres || (genre ? [genre] : []),
  };
  suggestions.unshift(suggestion);
  saveSuggestions();
  return suggestion;
}

function deleteSuggestion(id) {
  suggestions = suggestions.filter((s) => s.id !== id);
  saveSuggestions();
}

function toggleVote(id) {
  const s = suggestions.find((s) => s.id === id);
  if (!s) return;
  const userKey = '_local_user';
  const idx = s.votedBy.indexOf(userKey);
  if (idx >= 0) {
    s.votedBy.splice(idx, 1);
    s.votes = Math.max(0, s.votes - 1);
  } else {
    s.votedBy.push(userKey);
    s.votes += 1;
  }
  saveSuggestions();
}

function cycleStatus(id, newStatus) {
  const s = suggestions.find((s) => s.id === id);
  if (!s) return;
  s.status = newStatus;
  saveSuggestions();
}

// ───── Filtering / Sorting ─────
function getFiltered() {
  let list = [...suggestions];

  if (activeFilter !== 'all') {
    list = list.filter((s) => s.status === activeFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.note.toLowerCase().includes(q) ||
        s.submitter.toLowerCase().includes(q) ||
        (s.genres || []).join(' ').toLowerCase().includes(q) ||
        (s.overview || '').toLowerCase().includes(q)
    );
  }

  switch (sortBy) {
    case 'newest':
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest':
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'most-votes':
      list.sort((a, b) => b.votes - a.votes);
      break;
    case 'title-az':
      list.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'highest-rated':
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
  }

  return list;
}

// ───── Rendering ─────
function render() {
  updateStats();
  const list = getFiltered();

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🍿</div>
        <h3>No suggestions yet</h3>
        <p>Be the first to suggest a movie! Click the button above to get started.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (s, i) => `
    <div class="suggestion-card" style="animation-delay:${i * 0.05}s" data-id="${s.id}">
      <div class="card-poster-area">
        ${
          s.backdropPath
            ? `<img src="${TMDB_IMG}/w780${s.backdropPath}" alt="${escapeHtml(s.title)}" loading="lazy" />`
            : s.posterPath
            ? `<img src="${TMDB_IMG}/w500${s.posterPath}" alt="${escapeHtml(s.title)}" loading="lazy" />`
            : `<div class="no-poster">🎬<span>No poster</span></div>`
        }
        <div class="poster-overlay"></div>
        ${s.rating ? `<div class="tmdb-rating">⭐ ${s.rating.toFixed(1)}</div>` : ''}
        ${
          s.genres && s.genres.length
            ? `<div class="card-poster-genres">${s.genres
                .slice(0, 3)
                .map((g) => `<span class="genre-chip">${escapeHtml(g)}</span>`)
                .join('')}</div>`
            : ''
        }
      </div>
      <div class="card-body">
        <div class="card-header">
          <span class="card-title">${escapeHtml(s.title)}</span>
          ${s.year ? `<span class="card-year">${escapeHtml(s.year)}</span>` : ''}
        </div>
        ${s.overview ? `<p class="card-overview">${escapeHtml(s.overview)}</p>` : ''}
        ${s.note ? `<p class="card-note">${escapeHtml(s.note)}</p>` : ''}
        <div class="card-meta">
          <div class="card-submitter">
            <span class="avatar">${getInitials(s.submitter)}</span>
            <span>${escapeHtml(s.submitter)}</span>
            <span class="card-date">· ${timeAgo(s.createdAt)}</span>
          </div>
          <div class="card-actions">
            <button class="btn-vote ${s.votedBy.includes('_local_user') ? 'voted' : ''}"
                    onclick="handleVote('${s.id}')" title="Upvote">
              👍 <span>${s.votes}</span>
            </button>
            <div class="card-status-wrap">
              <button class="btn-status ${s.status}"
                      onclick="toggleStatusMenu(event, '${s.id}')">
                ${s.status}
              </button>
              <div class="status-menu" id="status-menu-${s.id}">
                <button onclick="handleStatus('${s.id}','pending')">⏳ Pending</button>
                <button onclick="handleStatus('${s.id}','approved')">✅ Approved</button>
                <button onclick="handleStatus('${s.id}','watched')">🎬 Watched</button>
                <button onclick="handleStatus('${s.id}','available')">📥 Available</button>
                <button onclick="handleStatus('${s.id}','declined')">❌ Declined</button>
              </div>
            </div>
            <button class="btn-delete" onclick="handleDelete('${s.id}')" title="Remove">🗑️</button>
          </div>
        </div>
      </div>
    </div>`
    )
    .join('');
}

function renderWithTransition() {
  if (document.startViewTransition) {
    document.startViewTransition(() => render());
  } else {
    render();
  }
}

function animateValue(obj, start, end, duration) {
  if (start === end) {
    obj.textContent = end;
    return;
  }
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // Use ease-out for smoother counting
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    obj.textContent = Math.floor(easeProgress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

function updateStats() {
  const newTotal = suggestions.length;
  animateValue(statTotal, parseInt(statTotal.textContent) || 0, newTotal, 600);

  const newPending = suggestions.filter((s) => s.status === 'pending').length;
  animateValue(statPending, parseInt(statPending.textContent) || 0, newPending, 600);

  const newApproved = suggestions.filter((s) => s.status === 'approved').length;
  animateValue(statApproved, parseInt(statApproved.textContent) || 0, newApproved, 600);

  const newWatched = suggestions.filter((s) => s.status === 'watched').length;
  animateValue(statWatched, parseInt(statWatched.textContent) || 0, newWatched, 600);

  if (statAvailable) {
    const newAvailable = suggestions.filter((s) => s.status === 'available').length;
    animateValue(statAvailable, parseInt(statAvailable.textContent) || 0, newAvailable, 600);
  }
}

// ───── Event Binding ─────
function bindEvents() {
  document.getElementById('btn-open-modal').addEventListener('click', openModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (tmdbResults.classList.contains('show')) {
        tmdbResults.classList.remove('show');
      } else {
        closeModal();
      }
    }
  });

  form.addEventListener('submit', handleSubmit);

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderWithTransition();
  });

  sortSelect.addEventListener('change', (e) => {
    sortBy = e.target.value;
    renderWithTransition();
  });

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderWithTransition();
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.card-status-wrap')) {
      document.querySelectorAll('.status-menu.show').forEach((m) => m.classList.remove('show'));
    }
    // Close TMDB results when clicking outside
    if (!e.target.closest('.form-group') || e.target.closest('#tmdb-search-results')) {
      // keep open if clicking inside results
    } else if (!e.target.closest('#field-title')) {
      tmdbResults.classList.remove('show');
    }
  });

  // TMDB search on title input
  titleInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (selectedTmdb) {
      // User is editing after selecting — clear selection
      selectedTmdb = null;
      tmdbPreview.classList.remove('show');
    }

    if (!hasTmdbKey() || query.length < 2) {
      tmdbResults.classList.remove('show');
      return;
    }

    tmdbResults.innerHTML = '<div class="tmdb-search-loading">Searching TMDB…</div>';
    tmdbResults.classList.add('show');

    searchTimeout = setTimeout(async () => {
      const results = await searchTmdb(query);
      renderTmdbResults(results);
    }, 350);
  });

  // TMDB API key setup
  document.getElementById('btn-tmdb-setup').addEventListener('click', showTmdbSetup);

  // Jellyfin API setup
  const btnJellyfin = document.getElementById('btn-jellyfin-setup');
  if (btnJellyfin) btnJellyfin.addEventListener('click', showJellyfinSetup);
}

// ───── Jellyfin Search ─────
async function searchJellyfin(title) {
  const cfg = getJellyfinConfig();
  if (!cfg.url || !cfg.key || !title) return false;
  
  try {
    const res = await fetch(
      `${cfg.url.replace(/\/$/, '')}/Items?searchTerm=${encodeURIComponent(title)}&IncludeItemTypes=Movie&Recursive=true`, 
      {
        headers: {
          'Authorization': `MediaBrowser Token="${cfg.key}", Client="SuggestionBoard"`
        }
      }
    );
    if (!res.ok) throw new Error('Jellyfin API error');
    const data = await res.json();
    return data.Items && data.Items.length > 0;
  } catch (err) {
    console.warn('Jellyfin search failed:', err);
    return false;
  }
}

// ───── Handlers ─────
async function handleSubmit(e) {
  e.preventDefault();
  const fd = new FormData(form);
  const title = fd.get('title');
  if (!title || !title.trim()) {
    showToast('Please enter a movie title.', 'error');
    return;
  }

  // Check Jellyfin if configured
  const btnSubmit = document.getElementById('btn-submit');
  const originalText = btnSubmit.innerHTML;
  let isAvailable = false;
  
  if (hasJellyfinConfig()) {
    btnSubmit.innerHTML = '⏳ Checking Jellyfin...';
    btnSubmit.disabled = true;
    isAvailable = await searchJellyfin(title.trim());
    btnSubmit.innerHTML = originalText;
    btnSubmit.disabled = false;
  }

  const suggestion = addSuggestion({
    title: fd.get('title'),
    year: fd.get('year'),
    genre: fd.get('genre'),
    note: fd.get('note'),
    submitter: fd.get('submitter'),
    tmdb: selectedTmdb || null,
  });

  if (isAvailable) {
    cycleStatus(suggestion.id, 'available');
    showToast(`"${suggestion.title}" is already on Jellyfin! Marked as Available.`, 'info');
  } else {
    showToast('Suggestion added! 🎉', 'success');
    launchConfetti();
  }

  form.reset();
  selectedTmdb = null;
  tmdbPreview.classList.remove('show');
  tmdbPreview.innerHTML = '';
  closeModal();
  renderWithTransition();
}

function handleVote(id) {
  toggleVote(id);
  renderWithTransition();
}

function handleStatus(id, status) {
  cycleStatus(id, status);
  document.querySelectorAll('.status-menu.show').forEach((m) => m.classList.remove('show'));
  renderWithTransition();
  showToast(`Status → ${status}`, 'info');
}

function handleDelete(id) {
  const s = suggestions.find((s) => s.id === id);
  if (!s) return;
  if (!confirm(`Remove "${s.title}" from suggestions?`)) return;
  deleteSuggestion(id);
  renderWithTransition();
  showToast('Suggestion removed.', 'info');
}

function toggleStatusMenu(e, id) {
  e.stopPropagation();
  const menu = document.getElementById(`status-menu-${id}`);
  const isOpen = menu.classList.contains('show');
  document.querySelectorAll('.status-menu.show').forEach((m) => m.classList.remove('show'));
  if (!isOpen) menu.classList.add('show');
}

// ───── Jellyfin Key Setup ─────
function showJellyfinSetup() {
  const cfg = getJellyfinConfig();
  const url = prompt(
    'Enter your Jellyfin Server URL (e.g., http://192.168.1.100:8096)\n\nLeave blank to clear config.',
    cfg.url || ''
  );

  if (url === null) return; // cancelled
  if (!url.trim()) {
    localStorage.removeItem('jellyfin_url');
    localStorage.removeItem('jellyfin_api_key');
    window._JELLYFIN_URL = '';
    window._JELLYFIN_KEY = '';
    showToast('Jellyfin config cleared.', 'info');
    return;
  }

  const key = prompt(
    'Enter your Jellyfin API Key.\n(Generated in Jellyfin Admin Dashboard -> Advanced -> API Keys)',
    cfg.key || ''
  );

  if (key !== null && key.trim()) {
    localStorage.setItem('jellyfin_url', url.trim());
    localStorage.setItem('jellyfin_api_key', key.trim());
    window._JELLYFIN_URL = url.trim();
    window._JELLYFIN_KEY = key.trim();
    showToast('Jellyfin API config saved! 🍿', 'success');
  }
}

// ───── TMDB Key Setup ─────
function showTmdbSetup() {
  const currentKey = getTmdbKey();
  const key = prompt(
    'Enter your TMDB API key to enable movie posters & metadata.\n\nGet a free key at: https://www.themoviedb.org/settings/api\n\nCurrent key: ' +
      (currentKey ? currentKey.substring(0, 8) + '…' : 'Not set'),
    currentKey || ''
  );

  if (key !== null) {
    if (key.trim()) {
      setTmdbKey(key.trim());
      showToast('TMDB API key saved! 🎬', 'success');
    } else {
      localStorage.removeItem('tmdb_api_key');
      window._TMDB_KEY = '';
      showToast('TMDB API key removed.', 'info');
    }
  }
}

// ───── Modal ─────
function openModal() {
  modalOverlay.classList.add('active');
  setTimeout(() => {
    titleInput.focus();
  }, 300);
}

function closeModal() {
  modalOverlay.classList.remove('active');
  tmdbResults.classList.remove('show');
}

// ───── Confetti 🎊 ─────
function launchConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#7c5cfc', '#e84393', '#f9ca24', '#00d2d3', '#ff6b6b', '#6c5ce7', '#fd79a8', '#ffeaa7'];
  const shapes = ['square', 'circle'];

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = Math.random() * 8 + 6;

    piece.style.left = Math.random() * 100 + '%';
    piece.style.width = size + 'px';
    piece.style.height = size + 'px';
    piece.style.background = color;
    piece.style.borderRadius = shape === 'circle' ? '50%' : '2px';
    piece.style.animationDelay = Math.random() * 0.8 + 's';
    piece.style.animationDuration = Math.random() * 1.5 + 1.5 + 's';

    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 3500);
}

// ───── Toasts ─────
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ───── Utilities ─────
function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
