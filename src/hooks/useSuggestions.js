import { useState, useEffect } from 'react';

const STORAGE_KEY = 'jellyfin_suggestions_v2';

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(suggestions));
    } catch (e) {
      console.warn("Failed to save to localStorage", e);
    }
  }, [suggestions]);

  const addSuggestion = (data) => {
    const newSug = {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      year: data.year ? data.year.trim() : '',
      genre: data.genre || '',
      note: data.note ? data.note.trim() : '',
      submitter: data.submitter ? data.submitter.trim() : 'Anonymous',
      votes: 0,
      votedBy: [],
      status: data.isAvailable ? 'available' : 'pending',
      createdAt: new Date().toISOString(),
      tmdbId: data.tmdb?.id || null,
      posterPath: data.tmdb?.posterPath || null,
      backdropPath: data.tmdb?.backdropPath || null,
      overview: data.tmdb?.overview || '',
      rating: data.tmdb?.rating || 0,
      genres: data.tmdb?.genres || (data.genre ? [data.genre] : []),
    };
    setSuggestions(prev => [newSug, ...prev]);
    return newSug;
  };

  const deleteSuggestion = (id) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const toggleVote = (id) => {
    setSuggestions(prev => prev.map(s => {
      if (s.id !== id) return s;
      const userKey = '_local_user';
      const voted = s.votedBy.includes(userKey);
      return {
        ...s,
        votedBy: voted ? s.votedBy.filter(u => u !== userKey) : [...s.votedBy, userKey],
        votes: voted ? Math.max(0, s.votes - 1) : s.votes + 1
      };
    }));
  };

  const setStatus = (id, status) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  return { suggestions, addSuggestion, deleteSuggestion, toggleVote, setStatus };
}
