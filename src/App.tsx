import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Globe, 
  FileText, 
  Database, 
  Copy, 
  Check, 
  Loader2, 
  ChevronRight, 
  Terminal,
  ExternalLink,
  Code2,
  Sparkles,
  Download,
  History as HistoryIcon,
  Trash2,
  Layers,
  AlertCircle,
  XCircle,
  Cpu,
  Activity,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface ScrapeResult {
  id?: number;
  title: string;
  url: string;
  markdown: string;
  metadata?: any;
  created_at?: string;
}

interface CrawlResult {
  results: ScrapeResult[];
}

// --- Components ---

const Header = () => (
  <header className="border-b border-white/5 p-4 flex items-center justify-between bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-50">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-[var(--accent)] flex items-center justify-center rounded-xl shadow-lg shadow-[var(--accent-glow)]">
        <Zap className="text-white w-6 h-6 fill-white" />
      </div>
      <div>
        <h1 className="font-bold text-lg tracking-tight text-white">FIRECRAWL <span className="text-[var(--accent)]">CORE</span></h1>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-[var(--ink-muted)] uppercase tracking-widest">Neural Ingestion Engine?</span>
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span className="text-[9px] font-mono text-[var(--accent)] uppercase tracking-widest">v1.2.0</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <div className="hidden md:flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-emerald-500" />
          <span>Latency: 42ms</span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-3 h-3 text-amber-500" />
          <span>Load: 0.24</span>
        </div>
      </div>
      <div className="h-8 w-px bg-white/10" />
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-mono uppercase text-emerald-400">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        Operational
      </div>
    </div>
  </header>
);

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 group relative ${
      active 
        ? 'bg-white/5 text-white shadow-inner' 
        : 'text-[var(--ink-muted)] hover:text-white hover:bg-white/[0.02]'
    }`}
  >
    {active && (
      <motion.div 
        layoutId="sidebar-active"
        className="absolute left-0 w-1 h-6 bg-[var(--accent)] rounded-r-full"
      />
    )}
    <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-[var(--accent)]' : ''}`} />
    <span className="text-xs font-medium tracking-wide">{label}</span>
    {active && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
  </button>
);

export default function App() {
  const [url, setUrl] = useState('');
  const [crawlLimit, setCrawlLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [crawlResults, setCrawlResults] = useState<ScrapeResult[]>([]);
  const [history, setHistory] = useState<ScrapeResult[]>([]);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [isStructuring, setIsStructuring] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scrape' | 'crawl' | 'history'>('scrape');

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setResult(null);
    setStructuredData(null);
    setError(null);
    
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to scrape the website. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setCrawlResults([]);
    setResult(null);
    setStructuredData(null);
    setError(null);
    
    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, limit: crawlLimit }),
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setCrawlResults(data.results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to crawl the website.');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to purge the neural archive?')) return;
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteHistoryItem = async (id: number) => {
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      setHistory(history.filter(item => item.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStructure = async () => {
    if (!result?.markdown) return;
    
    setIsStructuring(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract structured information from the following web content in JSON format. Content: ${result.markdown.substring(0, 10000)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              entities: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING }
                  }
                } 
              },
              contactInfo: {
                type: Type.OBJECT,
                properties: {
                  email: { type: Type.STRING },
                  phone: { type: Type.STRING }
                }
              }
            }
          }
        }
      });
      
      if (response.text) {
        setStructuredData(JSON.parse(response.text));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsStructuring(false);
    }
  };

  const downloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-white/5 flex flex-col bg-[var(--bg)] p-4">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-mono text-[var(--ink-muted)] uppercase tracking-[0.2em] mb-4 px-4">Workspace</p>
              <nav className="space-y-1">
                <SidebarItem 
                  icon={Zap} 
                  label="Direct Ingestion" 
                  active={activeTab === 'scrape'} 
                  onClick={() => setActiveTab('scrape')}
                />
                <SidebarItem 
                  icon={Layers} 
                  label="Recursive Crawl" 
                  active={activeTab === 'crawl'} 
                  onClick={() => setActiveTab('crawl')}
                />
                <SidebarItem 
                  icon={HistoryIcon} 
                  label="Neural Archive" 
                  active={activeTab === 'history'} 
                  onClick={() => setActiveTab('history')}
                />
              </nav>
            </div>

            <div className="h-px bg-white/5 mx-4" />

            <div className="px-4">
              <p className="text-[10px] font-mono text-[var(--ink-muted)] uppercase tracking-[0.2em] mb-4">System Telemetry</p>
              <div className="space-y-3">
                <div className="glass-card p-3 bg-white/[0.02]">
                  <div className="flex justify-between items-center text-[10px] font-mono mb-2">
                    <span className="text-[var(--ink-muted)]">Buffer Utilization</span>
                    <span className="text-[var(--accent)]">42%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '42%' }}
                      className="bg-[var(--accent)] h-full shadow-[0_0_8px_var(--accent)]" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-auto p-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-indigo-600 flex items-center justify-center text-xs font-bold">
                AI
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-white">Gemini 3 Flash</p>
                <p className="text-[10px] text-[var(--ink-muted)] truncate">Model: v1.5-preview</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[var(--bg)] relative">
          <div className="max-w-6xl mx-auto p-12">
            
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="mb-8"
                >
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-4 shadow-2xl shadow-red-500/5">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-400 uppercase tracking-tight">System Fault Detected</p>
                      <p className="text-xs text-red-400/70 mt-1 font-mono leading-relaxed">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                      <XCircle className="w-5 h-5 text-red-500/50" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrape Tab */}
            {activeTab === 'scrape' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <section className="mb-16">
                  <div className="mb-8">
                    <h2 className="text-5xl font-bold tracking-tighter text-white mb-4">
                      INGEST <span className="text-[var(--accent)] italic font-serif">TARGET</span>
                    </h2>
                    <p className="text-lg text-[var(--ink-muted)] max-w-2xl leading-relaxed">
                      Deploy the neural crawler to any URL. Extract, clean, and structure web data with sub-second latency.
                    </p>
                  </div>

                  <form onSubmit={handleScrape} className="flex gap-4">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-0 bg-[var(--accent)] opacity-0 group-focus-within:opacity-5 blur-xl transition-opacity duration-500 pointer-events-none" />
                      <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-muted)] group-focus-within:text-[var(--accent)] transition-colors pointer-events-none z-20" />
                      <input 
                        type="url" 
                        placeholder="Enter target URL (e.g. https://openai.com/blog)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="input-field w-full pl-14 pr-6 py-5 text-base relative z-10"
                        required
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="btn-primary min-w-[160px] flex items-center justify-center gap-3"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                      <span className="uppercase tracking-widest text-xs font-bold">
                        {loading ? 'Ingesting' : 'Execute'}
                      </span>
                    </button>
                  </form>
                </section>

                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -40 }}
                      className="space-y-12"
                    >
                      {/* Result Header */}
                      <div className="flex flex-col md:flex-row items-start justify-between gap-8 pb-12 border-b border-white/5">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full border border-emerald-500/20">
                              Ingestion Complete
                            </span>
                            <span className="text-[10px] font-mono text-[var(--ink-muted)] uppercase tracking-widest">
                              ID: {Math.random().toString(36).substring(7).toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-4xl font-bold text-white tracking-tight leading-tight">{result.title}</h3>
                          <a href={result.url} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent)] flex items-center gap-2 hover:underline font-mono">
                            {result.url} <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => copyToClipboard(result.markdown)}
                            className="btn-secondary flex items-center gap-2"
                            title="Copy Markdown"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            <span className="uppercase tracking-widest text-[10px] font-bold">Copy</span>
                          </button>
                          <button 
                            onClick={() => downloadMarkdown(result.markdown, result.title)}
                            className="btn-secondary flex items-center gap-2"
                            title="Export Markdown"
                          >
                            <Download className="w-4 h-4" />
                            <span className="uppercase tracking-widest text-[10px] font-bold">Export</span>
                          </button>
                          <button 
                            onClick={handleStructure}
                            disabled={isStructuring}
                            className="btn-primary flex items-center gap-2"
                          >
                            {isStructuring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-current" />}
                            <span className="uppercase tracking-widest text-[10px] font-bold">Neural Parse</span>
                          </button>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                        {/* Markdown Preview */}
                        <div className="xl:col-span-7 space-y-4">
                          <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-[var(--accent)]" />
                              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-muted)]">Markdown Stream</span>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--ink-muted)]">Size: {(result.markdown.length / 1024).toFixed(2)} KB</span>
                          </div>
                          <div className="glass-card bg-black/40 p-10 h-[800px] overflow-y-auto custom-scrollbar">
                            <div className="markdown-body">
                              {result.markdown}
                            </div>
                          </div>
                        </div>

                        {/* Structured Data / Metadata */}
                        <div className="xl:col-span-5 space-y-8">
                          {/* Metadata Card */}
                          <div className="glass-card p-8 space-y-6">
                            <div className="flex items-center gap-3">
                              <Terminal className="w-4 h-4 text-amber-500" />
                              <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-muted)]">Source Metadata</h4>
                            </div>
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase text-white/40 tracking-wider">Description</p>
                                <p className="text-sm text-white/80 leading-relaxed italic font-serif">
                                  {result.metadata?.description || 'No descriptive metadata detected in source stream.'}
                                </p>
                              </div>
                              {result.metadata?.ogImage && (
                                <div className="space-y-3">
                                  <p className="text-[10px] font-bold uppercase text-white/40 tracking-wider">Visual Asset</p>
                                  <div className="relative group rounded-xl overflow-hidden border border-white/10">
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
                                    <img src={result.metadata.ogImage} alt="OG" className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* AI Structured Data */}
                          <AnimatePresence>
                            {structuredData && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="glass-card p-8 border-[var(--accent)]/30 bg-gradient-to-br from-black to-[var(--accent)]/5"
                              >
                                <div className="flex items-center justify-between mb-8">
                                  <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5 text-[var(--accent)]" />
                                    <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white">Neural Extraction</h4>
                                  </div>
                                  <div className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] text-[8px] font-mono uppercase rounded border border-[var(--accent)]/30">
                                    Gemini-3-Flash
                                  </div>
                                </div>
                                <div className="space-y-8 font-mono text-[11px]">
                                  <div className="space-y-2">
                                    <p className="text-[var(--accent)] flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full shadow-[0_0_8px_var(--accent)]" />
                                      Executive Summary
                                    </p>
                                    <p className="text-white/70 leading-relaxed pl-3.5 border-l border-white/10">
                                      {structuredData.summary}
                                    </p>
                                  </div>
                                  <div className="space-y-3">
                                    <p className="text-[var(--accent)] flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full shadow-[0_0_8px_var(--accent)]" />
                                      Key Data Points
                                    </p>
                                    <ul className="space-y-2 pl-3.5 border-l border-white/10">
                                      {structuredData.keyPoints?.map((point: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-white/60">
                                          <span className="text-[var(--accent)] mt-0.5">›</span>
                                          <span>{point}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  {structuredData.entities?.length > 0 && (
                                    <div className="space-y-3">
                                      <p className="text-[var(--accent)] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full shadow-[0_0_8px_var(--accent)]" />
                                        Identified Entities
                                      </p>
                                      <div className="flex flex-wrap gap-2 pl-3.5 border-l border-white/10">
                                        {structuredData.entities.map((ent: any, i: number) => (
                                          <span key={i} className="px-2.5 py-1 bg-white/5 rounded-lg text-[9px] border border-white/10 hover:border-[var(--accent)]/50 transition-colors cursor-default">
                                            {ent.name} <span className="opacity-40 ml-1">[{ent.type}]</span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-[var(--accent)] blur-3xl opacity-10 animate-pulse" />
                        <Globe className="w-20 h-20 text-[var(--ink-muted)] relative" />
                      </div>
                      <p className="text-xl font-bold text-white/40 uppercase tracking-[0.3em]">Awaiting Target</p>
                      <p className="text-[10px] font-mono text-white/20 mt-4 uppercase tracking-widest">System ready for ingestion sequence</p>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Crawl Tab */}
            {activeTab === 'crawl' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <section className="mb-16">
                  <div className="mb-8">
                    <h2 className="text-5xl font-bold tracking-tighter text-white mb-4">
                      RECURSIVE <span className="text-[var(--accent)] italic font-serif">CRAWL</span>
                    </h2>
                    <p className="text-lg text-[var(--ink-muted)] max-w-2xl leading-relaxed">
                      Map and ingest entire domains. Automate the conversion of complex site structures into structured Markdown archives.
                    </p>
                  </div>

                  <form onSubmit={handleCrawl} className="space-y-6 max-w-4xl">
                    <div className="flex gap-4">
                      <div className="relative flex-1 group">
                        <div className="absolute inset-0 bg-[var(--accent)] opacity-0 group-focus-within:opacity-5 blur-xl transition-opacity duration-500 pointer-events-none" />
                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-muted)] group-focus-within:text-[var(--accent)] transition-colors pointer-events-none z-20" />
                        <input 
                          type="url" 
                          placeholder="Base domain (e.g. https://docs.firecrawl.dev)"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="input-field w-full pl-14 pr-6 py-5 text-base relative z-10"
                          required
                        />
                      </div>
                      <div className="w-40 relative group">
                        <input 
                          type="number" 
                          min="1" 
                          max="20"
                          value={crawlLimit}
                          onChange={(e) => setCrawlLimit(parseInt(e.target.value))}
                          className="input-field w-full px-6 py-5 text-base text-center"
                          title="Page Limit"
                        />
                        <span className="absolute -top-2.5 left-4 px-2 bg-[var(--bg)] text-[9px] font-mono text-[var(--ink-muted)] uppercase tracking-widest">Limit</span>
                      </div>
                      <button 
                        type="submit"
                        disabled={loading}
                        className="btn-primary min-w-[180px] flex items-center justify-center gap-3"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
                        <span className="uppercase tracking-widest text-xs font-bold">
                          {loading ? 'Crawling' : 'Deploy'}
                        </span>
                      </button>
                    </div>
                  </form>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {crawlResults.map((res, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card p-5 flex items-center justify-between group hover:border-[var(--accent)]/40 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-mono text-[var(--accent)] shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{res.title}</h4>
                          <p className="text-[10px] font-mono text-[var(--ink-muted)] truncate">{res.url}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => copyToClipboard(res.markdown)}
                          className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-[var(--accent)] transition-colors"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => downloadMarkdown(res.markdown, res.title)}
                          className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-[var(--accent)] blur-2xl opacity-20 animate-pulse" />
                        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)] relative" />
                      </div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white animate-pulse">Neural Mapping in Progress...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-5xl font-bold tracking-tighter text-white mb-4">
                      NEURAL <span className="text-[var(--accent)] italic font-serif">ARCHIVE</span>
                    </h2>
                    <p className="text-lg text-[var(--ink-muted)] max-w-2xl leading-relaxed">
                      Review and manage your historical ingestion sequences. All data is persisted in the local neural core.
                    </p>
                  </div>
                  {history.length > 0 && (
                    <button 
                      onClick={clearHistory}
                      className="btn-secondary border-red-500/20 text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="uppercase tracking-widest text-[10px] font-bold">Purge Archive</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {history.map((item, i) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card p-8 hover:border-[var(--accent)]/40 transition-all duration-500 group"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[9px] font-mono text-[var(--ink-muted)] uppercase tracking-widest">
                              {new Date(item.created_at!).toLocaleDateString()}
                            </span>
                            <span className="w-1 h-1 bg-white/10 rounded-full" />
                            <span className="text-[9px] font-mono text-[var(--accent)] uppercase tracking-widest">
                              {new Date(item.created_at!).toLocaleTimeString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-xl text-white truncate group-hover:text-[var(--accent)] transition-colors">{item.title}</h4>
                          <p className="text-xs text-[var(--ink-muted)] font-mono truncate">{item.url}</p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button 
                            onClick={() => {
                              const parsedItem = {
                                ...item,
                                metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
                              };
                              setResult(parsedItem);
                              setStructuredData(null);
                              setActiveTab('scrape');
                            }}
                            className="btn-primary py-2 px-5 text-[10px] font-bold uppercase tracking-widest"
                          >
                            Restore
                          </button>
                          <button 
                            onClick={() => deleteHistoryItem(item.id!)}
                            className="btn-secondary py-2 px-3 text-red-400 hover:bg-red-500/10 border-red-500/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {history.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center opacity-20">
                      <HistoryIcon className="w-16 h-16 mb-6" />
                      <p className="text-sm font-mono uppercase tracking-widest">Archive Empty</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </div>
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="bg-[var(--bg)] border-t border-white/5 px-6 py-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-muted)]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_emerald-500]" />
            Core: Cheerio/Turndown
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_blue-500]" />
            AI: Gemini-3-Flash
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8_purple-500]" />
            Storage: SQLite-3
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/20">|</span>
          <span className="text-white/80">{new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
}
