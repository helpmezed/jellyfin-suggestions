import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, Plus, Search, Check, Settings, Star, Database, ShieldAlert, Clock, ThumbsUp, Trash2, X } from 'lucide-react';
import { useSuggestions } from './hooks/useSuggestions';
import { searchTmdb, searchJellyfin, hasJellyfinConfig, setTmdbKey, setJellyfinConfig, getJellyfinConfig, getTmdbKey, getTmdbGenres } from './lib/api';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

const ASCII_ART = `
      _  _______ _      _ __     __  _____ _____ _   _ 
     | ||  ___| |    | |\\ \\   / / |  ___|_   _| \\ | |
     | || |__ | |    | | \\ \\_/ /  | |__   | | |  \\| |
 _   | ||  __|| |    | |  \\   /   |  __|  | | | . \` |
| |__| || |___| |____| |___| |    | |    _| |_| |\\  |
 \\____/ \\____/\\_____/\\_____/_|    \\_|   |_____\\_| \\_/
 :: SYSTEM SUGGESTIONS TERMINAL v3.1 :: SECURE //
`;

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
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="scanlines"></div>
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border pt-4 pb-4 mb-8 -mx-4 px-4 md:-mx-8 md:px-8">
        <pre className="text-primary terminal-glow text-[10px] sm:text-xs md:text-sm font-bold leading-tight mb-4 whitespace-pre-wrap font-mono">
          {ASCII_ART}
        </pre>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 font-mono text-sm">
            <span className="text-muted-foreground">TOTAL: <span className="text-foreground">{stats.total}</span></span>
            <span className="text-muted-foreground">PENDING: <span className="text-foreground">{stats.pending}</span></span>
            <span className="text-muted-foreground">APPROVED: <span className="text-foreground">{stats.approved}</span></span>
            <span className="text-muted-foreground">AVAIL: <span className="text-foreground">{stats.available}</span></span>
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
                    <Input value={tmdbInput} onChange={e => setTmdbInput(e.target.value)} placeholder="v3 auth key..." className="font-mono bg-black/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase">Jellyfin URL</label>
                    <Input value={jfUrlInput} onChange={e => setJfUrlInput(e.target.value)} placeholder="http://192.168.1.10:8096" className="font-mono bg-black/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase">Jellyfin API Key</label>
                    <Input value={jfKeyInput} onChange={e => setJfKeyInput(e.target.value)} placeholder="Auth Token..." className="font-mono bg-black/50" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={saveConfig} className="w-full bg-primary text-primary-foreground hover:bg-primary/80 uppercase tracking-widest font-bold">
                    SAVE CONFIGURATION
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isSuggestOpen} onOpenChange={setIsSuggestOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/80 font-mono uppercase tracking-wider text-xs font-bold">
                  <Plus className="w-4 h-4 mr-2" /> INJECT PAYLOAD
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border bg-background sm:max-w-xl font-mono">
                <DialogHeader>
                  <DialogTitle className="uppercase text-foreground tracking-widest text-lg">Inject Suggestion Payload</DialogTitle>
                </DialogHeader>
                <SuggestionForm onClose={() => setIsSuggestOpen(false)} onAdd={addSuggestion} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="SEARCH DATABASE..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9 font-mono bg-black/40 border-border uppercase"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scroll">
          {['all', 'pending', 'approved', 'watched', 'available', 'declined'].map(f => (
            <Button 
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={`font-mono uppercase text-xs ${filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {['newest', 'votes', 'rating'].map(s => (
             <Button 
              key={s}
              variant={sort === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSort(s)}
              className={`font-mono uppercase text-xs ${sort === s ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
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
    <Card className="bg-card border-border overflow-hidden flex flex-col font-mono relative group hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(46,204,113,0.15)]">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        {s.rating > 0 && (
          <Badge variant="outline" className="bg-black/80 backdrop-blur-sm border-yellow-500/30 text-yellow-500">
            ⭐ {s.rating.toFixed(1)}
          </Badge>
        )}
      </div>

      <div className="h-48 relative bg-muted overflow-hidden">
        {s.backdropPath || s.posterPath ? (
          <img 
            src={`https://image.tmdb.org/t/p/w500${s.backdropPath || s.posterPath}`} 
            alt={s.title}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity mix-blend-luminosity hover:mix-blend-normal"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground opacity-20">
            <Terminal className="w-16 h-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
        
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {s.genres?.slice(0,3).map(g => (
            <span key={g} className="text-[9px] uppercase px-1.5 py-0.5 border border-primary/30 bg-primary/10 text-primary">{g}</span>
          ))}
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg text-primary terminal-glow font-bold leading-tight uppercase tracking-wide">{s.title}</CardTitle>
          <Badge variant="outline" className={`uppercase text-[10px] tracking-wider ${statusColors[s.status] || ''}`}>
            {s.status}
          </Badge>
        </div>
        {s.year && <CardDescription className="text-muted-foreground text-xs">YR: {s.year}</CardDescription>}
      </CardHeader>
      
      <CardContent className="p-4 pt-0 flex-1">
        <p className="text-sm font-sans text-muted-foreground line-clamp-3 mb-3 leading-relaxed">{s.overview || 'No system overview available.'}</p>
        {s.note && (
          <div className="text-sm font-sans text-foreground/90 italic border-l-2 border-primary pl-3 bg-primary/5 py-2 pr-2 rounded-r-sm">
            "{s.note}"
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 border-t border-border flex justify-between items-center bg-black/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="opacity-50">USR:</span>
          <span className="text-foreground truncate max-w-[80px]">{s.submitter}</span>
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
  const [year, setYear] = useState('');
  const [genre, setGenre] = useState('');
  const [note, setNote] = useState('');
  const [submitter, setSubmitter] = useState('');
  
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
    setYear(movie.release_date ? movie.release_date.substring(0,4) : '');
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
      title, year, genre, note, submitter,
      tmdb: selectedTmdb,
      isAvailable
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4 relative">
      <div className="space-y-2 relative">
        <label className="text-xs text-muted-foreground uppercase">Target Identifier (Title)</label>
        <Input 
          value={title} 
          onChange={e => { setTitle(e.target.value); setSelectedTmdb(null); }}
          placeholder="e.g. The Matrix" 
          className="font-mono bg-black/50 border-primary/50 text-foreground"
          required
        />
        {isSearching && <div className="text-xs text-primary mt-1 animate-pulse">Querying external db...</div>}
        
        {tmdbResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-border rounded-sm shadow-xl z-50 max-h-48 overflow-y-auto">
            {tmdbResults.map(r => (
              <div 
                key={r.id} 
                onClick={() => handleSelectTmdb(r)}
                className="px-3 py-2 text-xs hover:bg-primary/20 cursor-pointer flex justify-between uppercase"
              >
                <span className="truncate pr-2">{r.title}</span>
                <span className="text-muted-foreground shrink-0">{r.release_date?.substring(0,4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTmdb && (
        <div className="bg-primary/5 border border-primary/20 p-3 flex gap-3 rounded-sm">
          {selectedTmdb.posterPath ? (
            <img src={`https://image.tmdb.org/t/p/w92${selectedTmdb.posterPath}`} alt={`${selectedTmdb.title} poster`} className="w-12 h-16 object-cover mix-blend-luminosity opacity-80" />
          ) : <div className="w-12 h-16 bg-black flex items-center justify-center"><Terminal className="w-6 h-6 text-primary/50"/></div>}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate text-primary terminal-glow font-mono">{selectedTmdb.title}</div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2 font-sans">{selectedTmdb.overview}</div>
          </div>
          <button type="button" onClick={() => setSelectedTmdb(null)} className="self-start text-muted-foreground hover:text-destructive"><X className="w-4 h-4"/></button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase">Year</label>
          <Input value={year} onChange={e => setYear(e.target.value)} className="font-mono bg-black/50" />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase">Agent</label>
          <Input value={submitter} onChange={e => setSubmitter(e.target.value)} placeholder="Anonymous" className="font-mono bg-black/50" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase">Mission Notes</label>
        <Textarea 
          value={note} 
          onChange={e => setNote(e.target.value)}
          className="font-sans bg-black/50 min-h-[80px] text-sm"
          placeholder="Why target this media..."
        />
      </div>

      <DialogFooter className="pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/80 uppercase font-bold tracking-widest relative overflow-hidden group"
        >
          {isSubmitting ? 'EXECUTING PAYLOAD...' : 'TRANSMIT REQUEST'}
          {!isSubmitting && <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_infinite] skew-x-12" />}
        </Button>
      </DialogFooter>
    </form>
  );
}
