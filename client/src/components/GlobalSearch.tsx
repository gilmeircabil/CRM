import React, { useState, useEffect, useRef } from 'react';
import { Search, User, DollarSign, CheckSquare, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';

interface SearchResult {
  customers: Array<{ _id: string; name: string; company: string; email: string }>;
  deals: Array<{ _id: string; title: string; value: number; stage: string }>;
  tasks: Array<{ _id: string; description: string; priority: string; isCompleted: boolean }>;
}

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await apiRequest<SearchResult>(`/api/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasAnyResults =
    results &&
    (results.customers.length > 0 || results.deals.length > 0 || results.tasks.length > 0);

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setIsOpen(true)}
          placeholder="Search customers, deals, tasks..."
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 max-h-96 overflow-y-auto">
          {!hasAnyResults && !isLoading && (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching records found for "{query}"
            </div>
          )}

          {results && results.customers.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                <User className="w-3 h-3 mr-1" /> Customers
              </div>
              {results.customers.map((c) => (
                <div
                  key={c._id}
                  onClick={() => {
                    navigate(`/customers/${c._id}`);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="text-slate-400">{c.company}</span>
                </div>
              ))}
            </div>
          )}

          {results && results.deals.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                <DollarSign className="w-3 h-3 mr-1" /> Deals
              </div>
              {results.deals.map((d) => (
                <div
                  key={d._id}
                  onClick={() => {
                    navigate('/pipeline');
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-medium text-slate-900">{d.title}</span>
                  <span className="text-indigo-600 font-semibold">${d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {results && results.tasks.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                <CheckSquare className="w-3 h-3 mr-1" /> Tasks
              </div>
              {results.tasks.map((t) => (
                <div
                  key={t._id}
                  onClick={() => {
                    navigate('/tasks');
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <span className={`font-medium ${t.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {t.description}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{t.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
