import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract: string | null;
  year: number | null;
  authors: Array<{ name: string }>;
  citationCount: number;
  isOpenAccess: boolean;
  url: string;
}

interface SemanticScholarResponse {
  data: SemanticScholarPaper[];
  total: number;
}

/**
 * Tool to search for academic papers on Semantic Scholar
 */
export const searchPapersTool = createTool({
  id: 'searchPapers',
  description: 'Search for academic research papers on any scientific topic using Semantic Scholar API. Returns paper titles, authors, abstracts, citation counts, and URLs.',
  inputSchema: z.object({
    query: z.string().describe('The research topic or query to search for (e.g., "machine learning", "CRISPR gene editing", "climate change impacts")'),
    limit: z.number().optional().default(10).describe('Number of papers to retrieve (default: 10, max: 20)'),
  }),
  execute: async ({ context }) => {
    const { query, limit = 10 } = context;
    
    console.log(`🔍 Searching papers for: "${query}"`);

    try {
      const searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}&fields=title,abstract,year,authors,citationCount,isOpenAccess,url`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Semantic Scholar API returned status ${response.status}`);
      }

      const data: SemanticScholarResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        return {
          success: false,
          message: `No papers found for topic: "${query}". Try a different search term or broader topic.`,
          papers: [],
        };
      }

      const papers = data.data.map((paper) => ({
        title: paper.title || 'Untitled',
        authors: paper.authors?.map(a => a.name).join(', ') || 'Unknown authors',
        year: paper.year || 'N/A',
        abstract: paper.abstract || 'No abstract available',
        citationCount: paper.citationCount || 0,
        isOpenAccess: paper.isOpenAccess || false,
        url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      }));

      console.log(`✅ Found ${papers.length} papers`);

      return {
        success: true,
        message: `Found ${papers.length} papers on "${query}"`,
        totalResults: data.total,
        papers,
      };
    } catch (error) {
      console.error('Error fetching papers:', error);
      return {
        success: false,
        message: `Failed to fetch papers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        papers: [],
      };
    }
  },
});

/**
 * Tool to get details of a specific paper by its Semantic Scholar ID
 */
export const getPaperDetailsTool = createTool({
  id: 'getPaperDetails',
  description: 'Get detailed information about a specific research paper including full abstract, references, and citations.',
  inputSchema: z.object({
    paperId: z.string().describe('The Semantic Scholar paper ID'),
  }),
  execute: async ({ context }) => {
    const { paperId } = context;
    
    console.log(`📄 Fetching details for paper: ${paperId}`);

    try {
      const detailsUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=title,abstract,year,authors,citationCount,referenceCount,fieldsOfStudy,publicationDate,journal,url`;
      
      const response = await fetch(detailsUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Paper not found or API error: ${response.status}`);
      }

      const paper = await response.json();

      return {
        success: true,
        paper: {
          title: paper.title,
          authors: paper.authors?.map((a: any) => a.name).join(', '),
          year: paper.year,
          abstract: paper.abstract || 'No abstract available',
          citationCount: paper.citationCount,
          referenceCount: paper.referenceCount,
          fieldsOfStudy: paper.fieldsOfStudy?.join(', '),
          publicationDate: paper.publicationDate,
          journal: paper.journal?.name,
          url: paper.url,
        },
      };
    } catch (error) {
      console.error('Error fetching paper details:', error);
      return {
        success: false,
        message: `Failed to fetch paper details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

/**
 * Tool to find papers by a specific author
 */
export const searchByAuthorTool = createTool({
  id: 'searchByAuthor',
  description: 'Find research papers by a specific author name.',
  inputSchema: z.object({
    authorName: z.string().describe('The author name to search for'),
    limit: z.number().optional().default(10).describe('Number of papers to retrieve'),
  }),
  execute: async ({ context }) => {
    const { authorName, limit = 10 } = context;
    
    console.log(`👤 Searching papers by author: "${authorName}"`);

    try {
      // First, search for the author
      const authorSearchUrl = `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(authorName)}&limit=1`;
      
      const authorResponse = await fetch(authorSearchUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!authorResponse.ok) {
        throw new Error('Author not found');
      }

      const authorData = await authorResponse.json();
      
      if (!authorData.data || authorData.data.length === 0) {
        return {
          success: false,
          message: `No author found with name: "${authorName}"`,
          papers: [],
        };
      }

      const authorId = authorData.data[0].authorId;

      // Get papers by this author
      const papersUrl = `https://api.semanticscholar.org/graph/v1/author/${authorId}/papers?limit=${limit}&fields=title,abstract,year,citationCount,url`;
      
      const papersResponse = await fetch(papersUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!papersResponse.ok) {
        throw new Error('Failed to fetch author papers');
      }

      const papersData = await papersResponse.json();

      const papers = papersData.data.map((paper: any) => ({
        title: paper.title,
        year: paper.year,
        abstract: paper.abstract || 'No abstract available',
        citationCount: paper.citationCount,
        url: paper.url,
      }));

      return {
        success: true,
        message: `Found ${papers.length} papers by ${authorName}`,
        authorName: authorData.data[0].name,
        papers,
      };
    } catch (error) {
      console.error('Error searching by author:', error);
      return {
        success: false,
        message: `Failed to search by author: ${error instanceof Error ? error.message : 'Unknown error'}`,
        papers: [],
      };
    }
  },
});