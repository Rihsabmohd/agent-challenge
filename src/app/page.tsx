'use client';

import { useState } from 'react';
import { CopilotChat } from '@copilotkit/react-ui';
import { useCopilotAction } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';

export default function Home() {
  const [papers, setPapers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Register action to render paper results dynamically
  useCopilotAction({
    name: 'searchPapers',
    description: 'Search for academic research papers and display results',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The research topic to search for',
        required: true,
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Number of papers to retrieve',
        required: false,
      },
    ],
    handler: async ({ query, limit = 10 }) => {
      setIsSearching(true);
      setPapers([]);
      // Actual search done by Mastra agent
      return { query, limit, status: 'searching' };
    },
    render: ({ status, result }) => {
      if (status === 'executing' || isSearching) {
        return (
          <div className="my-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
              <span className="text-indigo-700 font-medium">Searching papers...</span>
            </div>
          </div>
        );
      }

      if (result && result.papers) {
        return (
          <div className="my-6">
            <div className="grid gap-4">
              {result.papers.map((paper: any, index: number) => (
                <div
                  key={index}
                  className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-2">
                        {paper.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {paper.authors} • {paper.year}
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                        {paper.abstract}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">
                          📊 {paper.citationCount} citations
                        </span>
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          View Paper →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      return null;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  DeSci Research Partner
                </h1>
                <p className="text-sm text-gray-600">
                  AI-powered by Mastra + Nosana
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="hidden sm:inline">Powered by</span>
              <span className="font-semibold text-indigo-600">Nosana</span>
              <span className="hidden sm:inline">&</span>
              <span className="font-semibold text-purple-600">Mastra</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {/* Card 1 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Search Papers</h3>
              <p className="text-sm text-gray-600">
                Find relevant academic papers on any scientific topic instantly
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Get Summaries</h3>
              <p className="text-sm text-gray-600">
                AI-powered summaries of research findings and key insights
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Discover Trends
              </h3>
              <p className="text-sm text-gray-600">
                Identify research gaps and emerging areas in your field
              </p>
            </div>
          </div>

          {/* Example Queries */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-8 border border-indigo-100">
            <h3 className="font-semibold text-gray-900 mb-3">
              Try asking about:
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                'Recent advances in CRISPR gene editing',
                'Machine learning in drug discovery',
                'Climate change mitigation strategies',
                'Quantum computing applications',
                'Renewable energy technologies',
                'Neuroscience of memory formation',
              ].map((query) => (
                <button
                  key={query}
                  className="px-4 py-2 bg-white rounded-lg text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-gray-200 hover:border-indigo-300"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <CopilotChat
              className="h-[600px]"
              labels={{
                title: 'Research Assistant',
                initial:
                  "Hello! I'm your DeSci Research Partner. Ask me about any scientific topic, and I'll help you find and understand the latest research papers. Try: 'Find papers on machine learning' or 'What are the latest advances in renewable energy?'",
              }}
            />
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              Powered by{' '}
              <a
                href="https://www.semanticscholar.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Semantic Scholar
              </a>{' '}
              | Deployed on{' '}
              <a
                href="https://nosana.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Nosana Network
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
