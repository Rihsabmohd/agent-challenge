'use client';

import { useState, useEffect } from 'react';
import { CopilotChat } from '@copilotkit/react-ui';
import { useCopilotAction } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';

interface Paper {
  title: string;
  authors: string;
  year: number | string;
  abstract: string;
  citationCount: number;
  url: string;
  source?: string;
  paperId?: string;
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  downloads: number;
  url: string;
}

type ViewMode = 'chat' | 'search' | 'library' | 'graph';

export default function Home() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [bookmarkedPapers, setBookmarkedPapers] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [yearRange, setYearRange] = useState<[number, number]>([2010, 2024]);
  const [publicationType, setPublicationType] = useState<string>('all');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bookmarked-papers');
    if (saved) {
      try {
        setBookmarkedPapers(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load bookmarks:', e);
        setError('Failed to load saved bookmarks');
      }
    }
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Save bookmarks to localStorage
  const saveBookmark = (paper: Paper) => {
    try {
      if (isBookmarked(paper.title)) {
        setError('This paper is already bookmarked');
        return;
      }
      const updated = [...bookmarkedPapers, paper];
      setBookmarkedPapers(updated);
      localStorage.setItem('bookmarked-papers', JSON.stringify(updated));
      setSuccessMessage('✅ Paper bookmarked successfully');
    } catch (e) {
      setError('Failed to save bookmark');
      console.error('Bookmark save error:', e);
    }
  };

  const removeBookmark = (paperTitle: string) => {
    try {
      const updated = bookmarkedPapers.filter(p => p.title !== paperTitle);
      setBookmarkedPapers(updated);
      localStorage.setItem('bookmarked-papers', JSON.stringify(updated));
      setSuccessMessage('📚 Paper removed from library');
    } catch (e) {
      setError('Failed to remove bookmark');
      console.error('Bookmark remove error:', e);
    }
  };

  const isBookmarked = (paperTitle: string) => {
    return bookmarkedPapers.some(p => p.title === paperTitle);
  };

  // Generate citation
  const generateCitation = (paper: Paper, format: 'APA' | 'MLA' | 'BibTeX') => {
    if (format === 'APA') {
      return `${paper.authors} (${paper.year}). ${paper.title}. Retrieved from ${paper.url || 'URL not available'}`;
    } else if (format === 'MLA') {
      return `${paper.authors}. "${paper.title}." ${paper.year}. Web. Retrieved from ${paper.url || 'URL not available'}`;
    } else {
      return `@article{paper_${paper.year},
  title={${paper.title}},
  author={${paper.authors}},
  year={${paper.year}},
  url={${paper.url || 'URL not available'}}
}`;
    }
  };

  // Handle direct paper search via Semantic Scholar
  const handleDirectSearch = async (query: string) => {
    if (!query.trim()) {
      setError('❌ Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSuccessMessage(null);
    console.log('🔍 Starting search for:', query);

    try {
      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=10&fields=title,abstract,year,authors,citationCount,url,paperId`;
      
      console.log('📡 Fetching from Semantic Scholar API...');
      console.log('URL:', searchUrl);
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 API Response:', data);
      
      if (!data.data || data.data.length === 0) {
        setError(`❌ No papers found for "${query}". Try different keywords like "machine learning", "quantum computing", etc.`);
        setPapers([]);
        console.warn('No papers returned from API');
        setIsSearching(false);
        return;
      }

      const formattedPapers = data.data.map((p: any) => {
        const paperUrl = p.url || (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : '');
        return {
          title: p.title || 'Untitled',
          authors: p.authors && Array.isArray(p.authors) 
            ? p.authors.map((a: any) => typeof a === 'string' ? a : a.name).join(', ') 
            : 'Unknown',
          year: p.year || 'N/A',
          abstract: p.abstract || 'No abstract available',
          citationCount: p.citationCount || 0,
          url: paperUrl,
          paperId: p.paperId,
          source: 'Semantic Scholar',
        };
      });
      
      console.log('✅ Successfully formatted papers:', formattedPapers);
      setPapers(formattedPapers);
      setSuccessMessage(`✅ Found ${formattedPapers.length} papers on "${query}"`);
    } catch (error) {
      console.error('❌ Search error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setError(`❌ Search failed: ${errorMsg}. Please try again.`);
      setPapers([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Register CopilotKit action for displaying papers from agent
  useCopilotAction({
    name: 'displayPapers',
    description: 'Display paper results from search',
    parameters: [
      {
        name: 'papers',
        type: 'object[]',
        description: 'Array of paper objects with title, authors, url, etc',
        required: true,
      },
      {
        name: 'message',
        type: 'string',
        description: 'Status message to show user',
        required: false,
      },
    ],
    handler: async (props: any) => {
      try {
        console.log('📊 CopilotKit Action: displayPapers received:', props);
        
        const paperResults = props.papers;
        
        if (!paperResults || !Array.isArray(paperResults) || paperResults.length === 0) {
          const errorMsg = props.message || 'No papers found. Try a different search query.';
          console.warn('⚠️ No papers in action:', errorMsg);
          setError(`❌ ${errorMsg}`);
          setPapers([]);
          return { 
            success: false, 
            message: errorMsg,
            count: 0 
          };
        }

        // Ensure URLs are preserved and valid
        const validPapers = paperResults.map((p: any) => ({
          title: p.title || 'Untitled',
          authors: p.authors || 'Unknown Authors',
          year: p.year || 'N/A',
          abstract: p.abstract || 'No abstract available',
          citationCount: p.citationCount || 0,
          url: p.url || (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : ''),
          paperId: p.paperId,
          source: p.source || 'Semantic Scholar',
        }));

        setPapers(validPapers);
        setError(null);
        
        const successMsg = props.message || `✅ Found ${validPapers.length} papers`;
        setSuccessMessage(successMsg);
        console.log('✅ Papers displayed successfully:', validPapers);
        
        return { 
          success: true, 
          message: successMsg,
          count: validPapers.length 
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to display results';
        console.error('❌ Error in displayPapers action:', errorMsg);
        setError(`❌ Error: ${errorMsg}`);
        return { 
          success: false, 
          message: errorMsg,
          count: 0 
        };
      }
    },
    render: () => <></>,
  });

  // Register CopilotKit action for datasets
  useCopilotAction({
    name: 'displayDatasets',
    description: 'Display dataset results from HuggingFace',
    parameters: [
      {
        name: 'datasets',
        type: 'object[]',
        description: 'Array of dataset objects',
        required: true,
      },
      {
        name: 'message',
        type: 'string',
        description: 'Status message',
        required: false,
      },
    ],
    handler: async (props: any) => {
      try {
        console.log('📊 CopilotKit Action: displayDatasets received:', props);
        
        const datasetResults = props.datasets;
        
        if (!datasetResults || !Array.isArray(datasetResults) || datasetResults.length === 0) {
          const errorMsg = props.message || 'No datasets found.';
          console.warn('⚠️ No datasets in action:', errorMsg);
          setError(`❌ ${errorMsg}`);
          setDatasets([]);
          return { 
            success: false, 
            message: errorMsg,
            count: 0 
          };
        }

        setDatasets(datasetResults);
        setError(null);
        
        const successMsg = props.message || `✅ Found ${datasetResults.length} datasets`;
        setSuccessMessage(successMsg);
        console.log('✅ Datasets displayed successfully:', datasetResults);
        
        return { 
          success: true, 
          message: successMsg,
          count: datasetResults.length 
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to display datasets';
        console.error('❌ Error in displayDatasets action:', errorMsg);
        setError(`❌ Error: ${errorMsg}`);
        return { 
          success: false, 
          message: errorMsg,
          count: 0 
        };
      }
    },
    render: () => <></>,
  });

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Error Banner */}
      {error && (
        <div className="fixed top-20 left-0 right-0 mx-4 z-40 animate-fadeIn">
          <div className="max-w-6xl mx-auto bg-red-100 border-l-4 border-red-500 p-4 rounded-lg shadow-lg">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="fixed top-20 left-0 right-0 mx-4 z-40 animate-fadeIn">
          <div className="max-w-6xl mx-auto bg-green-100 border-l-4 border-green-500 p-4 rounded-lg shadow-lg">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Header - Orange Theme, No Gradient */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-orange-600">
                  DeSci Research Partner
                </h1>
                <p className="text-xs text-gray-600">AI-powered Research Platform</p>
              </div>
            </div>

            {/* View Mode Tabs - Orange Theme */}
            <div className="flex items-center gap-2">
              {[
                { id: 'chat', icon: '💬', label: 'Chat' },
                { id: 'search', icon: '🔍', label: 'Search' },
                { id: 'library', icon: '📚', label: 'Library' },
                { id: 'graph', icon: '🕸️', label: 'Graph' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    console.log('Switching to view:', tab.id);
                    setViewMode(tab.id as ViewMode);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === tab.id
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
              <div className="ml-4 px-3 py-2 bg-orange-100 rounded-lg text-xs font-medium text-orange-700">
                {bookmarkedPapers.length} Saved
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Chat View */}
        {viewMode === 'chat' && (
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {[
                { icon: '🔍', title: 'Smart Search', desc: 'AI-powered paper discovery' },
                { icon: '📊', title: 'Dataset Hub', desc: 'Find research datasets' },
                { icon: '🔗', title: 'Citation Network', desc: 'Explore paper relationships' },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-orange-200">
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-orange-200 overflow-hidden">
              <CopilotChat
                className="h-[600px]"
                labels={{
                  title: 'Research Assistant',
                  initial: "Hello! I'm your AI Research Partner. I can help you:\n\n• Find academic papers on any topic\n• Discover datasets for research\n• Analyze citations and relationships\n• Track research trends\n\nTry: 'Find papers on quantum computing' or 'Show me NLP datasets'",
                }}
              />
            </div>

            {/* Recent Papers Display */}
            {papers.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📄 Recent Results ({papers.length})</h2>
                <div className="grid gap-4">
                  {papers.slice(0, 5).map((paper, i) => (
                    <PaperCard
                      key={i}
                      paper={paper}
                      isBookmarked={isBookmarked(paper.title)}
                      onBookmark={() => saveBookmark(paper)}
                      onRemoveBookmark={() => removeBookmark(paper.title)}
                      onCite={() => setSelectedPaper(paper)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search View */}
        {viewMode === 'search' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-orange-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 Advanced Search</h2>
              
              {/* Search Bar */}
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Search papers, topics, or authors..."
                  value={searchQuery}
                  onChange={(e) => {
                    console.log('Search query changed:', e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      console.log('Enter key pressed');
                      handleDirectSearch(searchQuery);
                    }
                  }}
                  className="flex-1 px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isSearching}
                />
                <button 
                  onClick={() => {
                    console.log('Search button clicked with query:', searchQuery);
                    handleDirectSearch(searchQuery);
                  }}
                  disabled={isSearching}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Filters */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={yearRange[0]}
                      onChange={(e) => setYearRange([+e.target.value, yearRange[1]])}
                      className="w-24 px-3 py-2 border border-orange-300 rounded-lg focus:ring-orange-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      value={yearRange[1]}
                      onChange={(e) => setYearRange([yearRange[0], +e.target.value])}
                      className="w-24 px-3 py-2 border border-orange-300 rounded-lg focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publication Type
                  </label>
                  <select
                    value={publicationType}
                    onChange={(e) => setPublicationType(e.target.value)}
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-orange-500"
                  >
                    <option value="all">All Types</option>
                    <option value="conference">Conference</option>
                    <option value="journal">Journal</option>
                    <option value="preprint">Preprint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source
                  </label>
                  <select className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-orange-500">
                    <option>All Sources</option>
                    <option>Semantic Scholar</option>
                    <option>arXiv</option>
                    <option>PubMed</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input type="checkbox" id="smart-search" className="rounded text-orange-600 focus:ring-orange-500" />
                <label htmlFor="smart-search" className="text-sm text-gray-700">
                  🧠 Enable Smart Search (AI-powered relevance ranking)
                </label>
              </div>
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="text-center py-12 bg-white rounded-xl border border-orange-200">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">🔍 Searching papers...</p>
              </div>
            )}
            
            {!isSearching && papers.length === 0 && !error && (
              <div className="text-center py-12 bg-white rounded-xl border border-orange-200">
                <p className="text-gray-600">Enter a search query and click Search to find papers</p>
              </div>
            )}

            {papers.length > 0 && !isSearching && (
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold text-gray-900">📄 Search Results ({papers.length})</h3>
                {papers.map((paper, i) => (
                  <PaperCard
                    key={i}
                    paper={paper}
                    isBookmarked={isBookmarked(paper.title)}
                    onBookmark={() => saveBookmark(paper)}
                    onRemoveBookmark={() => removeBookmark(paper.title)}
                    onCite={() => setSelectedPaper(paper)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Library View */}
        {viewMode === 'library' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-orange-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">📚 My Library</h2>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium">
                    Export All (BibTeX)
                  </button>
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">
                    Generate Summary
                  </button>
                </div>
              </div>

              {bookmarkedPapers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <p className="text-gray-600 mb-2">Your library is empty</p>
                  <p className="text-sm text-gray-500">Bookmark papers to save them here</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bookmarkedPapers.map((paper, i) => (
                    <PaperCard
                      key={i}
                      paper={paper}
                      isBookmarked={true}
                      onBookmark={() => {}}
                      onRemoveBookmark={() => removeBookmark(paper.title)}
                      onCite={() => setSelectedPaper(paper)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Graph View */}
        {viewMode === 'graph' && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🕸️ Knowledge Graph</h2>
              <p className="text-gray-600 mb-6">
                Visualize relationships between papers, authors, and topics
              </p>
              
              <div className="bg-orange-50 rounded-lg p-12 text-center border-2 border-dashed border-orange-300">
                <div className="text-6xl mb-4">🔗</div>
                <p className="text-gray-700 font-medium mb-2">Interactive Graph Visualization</p>
                <p className="text-sm text-gray-600 mb-4">
                  Search for papers to see their citation networks and relationships
                </p>
                <button
                  onClick={() => setViewMode('search')}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  Start Searching
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Citation Modal - Orange Theme */}
      {selectedPaper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 border-2 border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">🔗 Generate Citation</h3>
              <button
                onClick={() => setSelectedPaper(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {['APA', 'MLA', 'BibTeX'].map((format) => (
                <div key={format} className="border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{format}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          generateCitation(selectedPaper, format as any)
                        );
                        setSuccessMessage('📋 Citation copied to clipboard!');
                      }}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 font-mono bg-orange-50 p-3 rounded break-words">
                    {generateCitation(selectedPaper, format as any)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

// Paper Card Component - Orange Theme
function PaperCard({
  paper,
  isBookmarked,
  onBookmark,
  onRemoveBookmark,
  onCite,
}: {
  paper: Paper;
  isBookmarked: boolean;
  onBookmark: () => void;
  onRemoveBookmark: () => void;
  onCite: () => void;
}) {
  // Ensure URL is valid
  const paperUrl = paper.url || (paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : '');

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm border border-orange-200 hover:border-orange-400 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg mb-2 leading-tight">
            {paper.title}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {paper.authors} • {paper.year}
          </p>
          <p className="text-sm text-gray-700 line-clamp-2 mb-4">
            {paper.abstract}
          </p>
          
          {/* Action Buttons - Orange Theme */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 px-3 py-1 bg-orange-50 rounded-full border border-orange-200">
              📊 {paper.citationCount} citations
            </span>
            <button
              onClick={isBookmarked ? onRemoveBookmark : onBookmark}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                isBookmarked
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              {isBookmarked ? '⭐ Saved' : '☆ Save'}
            </button>
            <button
              onClick={onCite}
              className="text-xs px-3 py-1 bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 font-medium border border-orange-200"
            >
              🔗 Cite
            </button>
            {paperUrl ? (
              <a
                href={paperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1 bg-orange-600 text-white rounded-full hover:bg-orange-700 font-medium"
              >
                View Paper →
              </a>
            ) : (
              <span className="text-xs px-3 py-1 bg-gray-200 text-gray-500 rounded-full cursor-not-allowed">
                URL not available
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}