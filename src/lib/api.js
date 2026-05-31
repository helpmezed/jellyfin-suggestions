const TMDB_BASE = 'https://api.themoviedb.org/3';

export const getTmdbKey = () => localStorage.getItem('tmdb_api_key') || '';
export const setTmdbKey = (key) => localStorage.setItem('tmdb_api_key', key);

export const getJellyfinConfig = () => ({
  url: localStorage.getItem('jellyfin_url') || '',
  key: localStorage.getItem('jellyfin_api_key') || ''
});

export const setJellyfinConfig = (url, key) => {
  localStorage.setItem('jellyfin_url', url);
  localStorage.setItem('jellyfin_api_key', key);
};

export const hasJellyfinConfig = () => {
  const cfg = getJellyfinConfig();
  return !!(cfg.url && cfg.key);
};

export async function searchTmdb(query) {
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

export async function getTmdbGenres(movieId) {
  const key = getTmdbKey();
  if (!key) return [];
  try {
    const res = await fetch(`${TMDB_BASE}/movie/${movieId}?api_key=${encodeURIComponent(key)}&language=en-US`);
    if (!res.ok) return [];
    const detail = await res.json();
    return (detail.genres || []).map((g) => g.name);
  } catch {
    return [];
  }
}

export async function searchJellyfin(title) {
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
