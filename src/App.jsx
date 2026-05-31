import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, Plus, Search, Check, Settings, Star, Database, ShieldAlert, Clock, ThumbsUp, Trash2, X, Film, Sparkles } from 'lucide-react';
import { useSuggestions } from './hooks/useSuggestions';
import { searchTmdb, searchJellyfin, hasJellyfinConfig, setTmdbKey, setJellyfinConfig, getJellyfinConfig, getTmdbKey, getTmdbGenres } from './lib/api';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function App() {
  const { suggestions, addSuggestion, deleteSuggestion, toggleVote, setStatus } = useSuggestions();
  
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [query, setQuery] = useState('');
  
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // TMDB / Jellyfin states for config modal
  const [tmdbInput, setTmdbInput] = useState(getTmdbKey());
  const [jfUrlInput, setJfUrlInput] = useState(getJellyfinConfig().url);
  const [jfKeyInput, setJfKeyInput] = useState(getJellyfinConfig().key);

  // Filter & Sort Logic
  const filteredSuggestions = useMemo(() => {
    let result = suggestions;
    if (filter !== 'all') {
      result = result.filter(s => s.status === filter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(q) || s.overview.toLowerCase().includes(q));
    }
    return result.sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === 'votes') return b.votes - a.votes;
      if (sort === 'rating') return b.rating - a.rating;
      return a.title.localeCompare(b.title);
    });
  }, [suggestions, filter, sort, query]);

  // Stats
  const stats = {
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === 'pending').length,
    approved: suggestions.filter(s => s.status === 'approved').length,
    available: suggestions.filter(s => s.status === 'available').length,
  };

  const saveConfig = () => {
    setTmdbKey(tmdbInput.trim());
    setJellyfinConfig(jfUrlInput.trim(), jfKeyInput.trim());
    setIsConfigOpen(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto relative z-10">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/60 backdrop-blur-2xl border-b border-white/5 pt-6 pb-4 mb-10 -mx-4 px-4 md:-mx-8 md:px-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col md:flex-row gap-6 md:gap-4 items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Film className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Cinematic <span className="text-primary">Dashboard</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">v4.0 // PREMIUM EDITION</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 md:gap-6 font-mono text-xs md:text-sm">
            <div className="flex flex-col items-center"><span className="text-muted-foreground text-[10px] uppercase">Total</span><span className="text-foreground font-bold">{stats.total}</span></div>
            <div className="flex flex-col items-center"><span className="text-muted-foreground text-[10px] uppercase">Pending</span><span className="text-yellow-500 font-bold">{stats.pending}</span></div>
            <div className="flex flex-col items-center"><span className="text-muted-foreground text-[10px] uppercase">Approved</span><span className="text-green-500 font-bold">{stats.approved}</span></div>
            <div className="flex flex-col items-center"><span className="text-muted-foreground text-[10px] uppercase">Available</span><span className="text-cyan-500 font-bold">{stats.available}</span></div>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono uppercase tracking-wider text-xs">
                  <Settings className="w-4 h-4 mr-2" /> SYS.CONFIG
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border bg-background sm:max-w-[425px] font-mono">
                <DialogHeader>
                  <DialogTitle className="uppercase text-foreground tracking-widest text-lg">System Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase">TMDB API Key</label>
                    <Input value={tmdbInput} onChange={e => setTmdbInput(e.target.value)} placeholder="v3 auth key..." className="font-mono bg-black/50 border-white/10 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase">Jellyfin URL</label>
                    <Input value={jfUrlInput} onChange={e => setJfUrlInput(e.target.value)} placeholder="http://192.168.1.10:8096" className="font-mono bg-black/50 border-white/10 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase">Jellyfin API Key</label>
                    <Input value={jfKeyInput} onChange={e => setJfKeyInput(e.target.value)} placeholder="Auth Token..." className="font-mono bg-black/50 border-white/10 rounded-lg" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={saveConfig} className="w-full bg-primary text-primary-foreground hover:bg-primary/80 uppercase tracking-widest font-bold rounded-lg shadow-lg">
                    SAVE CONFIGURATION
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isSuggestOpen} onOpenChange={setIsSuggestOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide rounded-full shadow-[0_0_20px_rgba(30,200,120,0.3)] transition-all hover:shadow-[0_0_30px_rgba(30,200,120,0.5)]">
                  <Sparkles className="w-4 h-4 mr-2" /> New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel sm:max-w-xl font-sans border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-foreground tracking-tight text-xl font-bold">New Suggestion Request</DialogTitle>
                </DialogHeader>
                <SuggestionForm onClose={() => setIsSuggestOpen(false)} onAdd={addSuggestion} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search titles or overviews..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-11 bg-black/40 border-white/10 rounded-full focus-visible:ring-primary/50 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scroll">
          {['all', 'pending', 'approved', 'watched', 'available', 'declined'].map(f => (
            <Button 
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={`rounded-full capitalize text-xs tracking-wide transition-all ${filter === f ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-black/20 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/10'}`}
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="w-px h-8 bg-border hidden md:block mx-2 self-center"></div>
        <div className="flex gap-2">
          {['newest', 'votes', 'rating'].map(s => (
             <Button 
              key={s}
              variant={sort === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSort(s)}
              className={`rounded-full capitalize text-xs tracking-wide transition-all ${sort === s ? 'bg-secondary text-secondary-foreground' : 'bg-black/20 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSuggestions.map(suggestion => (
          <SuggestionCard 
            key={suggestion.id} 
            s={suggestion} 
            onVote={() => toggleVote(suggestion.id)}
            onDelete={() => deleteSuggestion(suggestion.id)}
            onSetStatus={(status) => setStatus(suggestion.id, status)}
          />
        ))}
        {filteredSuggestions.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground font-mono uppercase tracking-widest flex flex-col items-center">
            <Database className="w-12 h-12 mb-4 opacity-50" />
            <p>0 records found in database.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ───── SUGGESTION CARD ─────
function SuggestionCard({ s, onVote, onDelete, onSetStatus }) {
  const voted = s.votedBy.includes('_local_user');
  
  const statusColors = {
    pending: 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10',
    approved: 'border-green-500/50 text-green-500 bg-green-500/10',
    available: 'border-cyan-500/50 text-cyan-500 bg-cyan-500/10',
    watched: 'border-purple-500/50 text-purple-500 bg-purple-500/10',
    declined: 'border-red-500/50 text-red-500 bg-red-500/10',
  };

  return (
    <Card className="glass-panel overflow-hidden flex flex-col relative group transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(30,200,120,0.2)] hover:border-white/10">
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        {s.rating > 0 && (
          <Badge variant="outline" className="bg-black/40 backdrop-blur-md border-yellow-500/30 text-yellow-500 font-mono">
            ⭐ {s.rating.toFixed(1)}
          </Badge>
        )}
      </div>

      <div className="h-56 relative bg-muted overflow-hidden">
        {s.posterPath || s.backdropPath ? (
          <img 
            src={`https://image.tmdb.org/t/p/w500${s.posterPath || s.backdropPath}`} 
            alt={s.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground opacity-20 bg-gradient-to-br from-black to-secondary">
            <Film className="w-16 h-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
        
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {s.genres?.slice(0,3).map(g => (
            <span key={g} className="text-[9px] uppercase px-1.5 py-0.5 border border-primary/30 bg-primary/10 text-primary">{g}</span>
          ))}
        </div>
      </div>

      <CardHeader className="p-5 pb-2 relative z-10 -mt-8">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl text-foreground font-bold leading-tight tracking-tight drop-shadow-md">{s.title}</CardTitle>
          <Badge variant="outline" className={`uppercase text-[10px] tracking-wider font-mono border ${statusColors[s.status] || ''}`}>
            {s.status}
          </Badge>
        </div>
        {s.year && <CardDescription className="text-primary/80 font-mono text-xs">{s.year}</CardDescription>}
      </CardHeader>
      
      <CardContent className="p-4 pt-0 flex-1">
        <p className="text-sm font-sans text-muted-foreground line-clamp-3 mb-3 leading-relaxed">{s.overview || 'No system overview available.'}</p>
        {s.imdbLink && (
          <a href={s.imdbLink} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-primary hover:underline font-mono mb-3">
            <Film className="w-3 h-3 mr-1" /> View on IMDb
          </a>
        )}
        {s.note && (
          <div className="text-sm font-sans text-foreground/90 italic border-l-2 border-primary pl-3 bg-primary/5 py-2 pr-2 rounded-r-sm">
            "{s.note}"
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 border-t border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] text-foreground border border-white/10 uppercase font-bold">
            {s.submitter?.substring(0,2) || 'AN'}
          </div>
          <span className="text-foreground/80 truncate max-w-[80px] font-medium">{s.submitter || 'Anonymous'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onVote}
            className={`h-7 px-2 font-mono text-xs ${voted ? 'bg-primary/20 text-primary border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ThumbsUp className={`w-3 h-3 mr-1.5 ${voted ? 'fill-primary' : ''}`} /> {s.votes}
          </Button>

          <div className="relative group/menu">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <Settings className="w-3 h-3" />
            </Button>
            <div className="absolute bottom-full right-0 mb-1 hidden group-hover/menu:flex flex-col bg-black border border-border p-1 rounded-sm shadow-xl z-50">
              <button onClick={() => onSetStatus('pending')} className="text-left px-3 py-1.5 text-xs text-yellow-500 hover:bg-yellow-500/20 uppercase">Pending</button>
              <button onClick={() => onSetStatus('approved')} className="text-left px-3 py-1.5 text-xs text-green-500 hover:bg-green-500/20 uppercase">Approved</button>
              <button onClick={() => onSetStatus('available')} className="text-left px-3 py-1.5 text-xs text-cyan-500 hover:bg-cyan-500/20 uppercase">Available</button>
              <button onClick={() => onSetStatus('watched')} className="text-left px-3 py-1.5 text-xs text-purple-500 hover:bg-purple-500/20 uppercase">Watched</button>
              <button onClick={() => onSetStatus('declined')} className="text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/20 uppercase">Declined</button>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// ───── FORM COMPONENT ─────
function SuggestionForm({ onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [imdbLink, setImdbLink] = useState('');
  
  const [tmdbResults, setTmdbResults] = useState([]);
  const [selectedTmdb, setSelectedTmdb] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (title.length < 2 || selectedTmdb) {
      setTmdbResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchTmdb(title);
      setTmdbResults(results);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [title, selectedTmdb]);

  const handleSelectTmdb = async (movie) => {
    const genres = await getTmdbGenres(movie.id);
    setSelectedTmdb({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? movie.release_date.substring(0,4) : '',
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      overview: movie.overview,
      rating: movie.vote_average,
      genres: genres
    });
    setTitle(movie.title);
    setTmdbResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    let isAvailable = false;
    if (hasJellyfinConfig()) {
      isAvailable = await searchJellyfin(title);
    }

    onAdd({
      title, 
      imdbLink, 
      submitter: 'Anonymous',
      year: selectedTmdb?.year || '',
      tmdb: selectedTmdb,
      isAvailable
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4 relative">
      <div className="space-y-2 relative">
        <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Search Title</label>
        <Input 
          value={title} 
          onChange={e => { setTitle(e.target.value); setSelectedTmdb(null); }}
          placeholder="e.g. The Matrix" 
          className="font-sans bg-black/30 border-white/10 rounded-lg text-foreground focus-visible:ring-primary/50 text-base"
          required
        />
        {isSearching && <div className="text-xs text-primary mt-1 animate-pulse">Querying external db...</div>}
        
        {tmdbResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl z-50 max-h-48 overflow-y-auto">
            {tmdbResults.map(r => (
              <div 
                key={r.id} 
                onClick={() => handleSelectTmdb(r)}
                className="px-4 py-3 text-sm hover:bg-white/5 cursor-pointer flex justify-between transition-colors border-b border-white/5 last:border-0"
              >
                <span className="truncate pr-2 font-medium">{r.title}</span>
                <span className="text-muted-foreground shrink-0">{r.release_date?.substring(0,4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTmdb && (
        <div className="bg-primary/10 border border-primary/20 p-3 flex gap-4 rounded-xl shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          {selectedTmdb.posterPath ? (
            <img src={`https://image.tmdb.org/t/p/w92${selectedTmdb.posterPath}`} alt={`${selectedTmdb.title} poster`} className="w-16 h-24 rounded-md object-cover shadow-lg" />
          ) : <div className="w-16 h-24 rounded-md bg-black/50 flex items-center justify-center"><Film className="w-6 h-6 text-primary/50"/></div>}
          <div className="flex-1 min-w-0 py-1">
            <div className="text-base font-bold truncate text-foreground tracking-tight">{selectedTmdb.title}</div>
            <div className="text-sm text-muted-foreground mt-1 line-clamp-3 font-sans leading-relaxed">{selectedTmdb.overview}</div>
          </div>
          <button type="button" onClick={() => setSelectedTmdb(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-1 transition-colors"><X className="w-4 h-4"/></button>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase font-medium">IMDb Link (Optional)</label>
        <Input 
          value={imdbLink} 
          onChange={e => setImdbLink(e.target.value)} 
          placeholder="https://www.imdb.com/title/tt0133093/" 
          className="font-sans bg-black/30 border-white/10 rounded-lg text-sm"
        />
      </div>

      <DialogFooter className="pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide rounded-lg shadow-lg relative overflow-hidden group h-12 text-base"
        >
          {isSubmitting ? 'PROCESSING...' : 'SUBMIT REQUEST'}
          {!isSubmitting && <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_infinite] skew-x-12" />}
        </Button>
      </DialogFooter>
    </form>
  );
}
