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
 * CRITICAL: Returns structured data that frontend can render
 */
export const searchPapersTool = createTool({
  id: 'searchPapers',
  description: 'Search for academic research papers on any scientific topic. Returns real paper data from Semantic Scholar API with working URLs.',
  inputSchema: z.object({
    query: z.string().describe('The research topic or query to search for'),
    limit: z.number().optional().default(10).describe('Number of papers to retrieve (default: 10, max: 20)'),
  }),
  execute: async ({ context }) => {
    const { query, limit = 10 } = context;
    
    console.log(`🔍 Searching papers for: "${query}"`);

    try {
      const searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}&fields=title,abstract,year,authors,citationCount,isOpenAccess,url,paperId`;
      
      const response = await fetch(searchUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Semantic Scholar API returned status ${response.status}`);
      }

      const data: SemanticScholarResponse = await response.json();
      
      if (!data.data || data.data.length === 0) {
        return {
          success: false,
          message: `No papers found for "${query}". Try a different search term.`,
          papers: [],
        };
      }

      // Format papers with guaranteed URLs
      const papers = data.data.map((paper) => ({
        title: paper.title || 'Untitled',
        authors: paper.authors?.map(a => a.name).join(', ') || 'Unknown authors',
        year: paper.year || 'N/A',
        abstract: paper.abstract || 'No abstract available',
        citationCount: paper.citationCount || 0,
        isOpenAccess: paper.isOpenAccess || false,
        // CRITICAL: Ensure URL is always set
        url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        paperId: paper.paperId,
      }));

      console.log(`✅ Found ${papers.length} papers with URLs`);

      // Return structured data for frontend
      return {
        success: true,
        message: `Found ${papers.length} papers on "${query}"`,
        totalResults: data.total,
        query: query,
        papers: papers,
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
 * Tool to search for datasets on Hugging Face
 */
export const datasetSearchTool = createTool({
  id: 'datasetSearch',
  description: 'Search for datasets on Hugging Face Hub. Returns real dataset data with working URLs.',
  inputSchema: z.object({
    query: z.string().describe('The dataset type or topic'),
    limit: z.number().optional().default(10).describe('Number of datasets to retrieve'),
  }),
  execute: async ({ context }) => {
    const { query, limit = 10 } = context;
    
    console.log(`📊 Searching datasets for: "${query}"`);

    try {
      const searchUrl = `https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=${limit}&sort=downloads&direction=-1`;
      
      const response = await fetch(searchUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API returned status ${response.status}`);
      }

      const datasets = await response.json();
      
      if (!datasets || datasets.length === 0) {
        return {
          success: false,
          message: `No datasets found for "${query}".`,
          datasets: [],
        };
      }

      const formattedDatasets = datasets.slice(0, limit).map((dataset: any) => ({
        id: dataset.id,
        name: dataset.id,
        description: dataset.description || 'No description available',
        downloads: dataset.downloads || 0,
        likes: dataset.likes || 0,
        tags: dataset.tags?.slice(0, 5).join(', ') || 'No tags',
        url: `https://huggingface.co/datasets/${dataset.id}`,
        lastModified: dataset.lastModified || 'Unknown',
      }));

      console.log(`✅ Found ${formattedDatasets.length} datasets`);

      return {
        success: true,
        message: `Found ${formattedDatasets.length} datasets for "${query}"`,
        datasets: formattedDatasets,
      };
      
    } catch (error) {
      console.error('Error fetching datasets:', error);
      return {
        success: false,
        message: `Failed to fetch datasets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        datasets: [],
      };
    }
  },
});

/**
 * Tool to get citation network for a paper
 */
export const citationNetworkTool = createTool({
  id: 'citationNetwork',
  description: 'Get citation relationships for a paper.',
  inputSchema: z.object({
    paperId: z.string().describe('The Semantic Scholar paper ID'),
    limit: z.number().optional().default(5).describe('Number of citations/references to retrieve'),
  }),
  execute: async ({ context }) => {
    const { paperId, limit = 5 } = context;
    
    console.log(`🔗 Fetching citation network for paper: ${paperId}`);

    try {
      const citationsUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperId}/citations?limit=${limit}&fields=title,year,authors,citationCount,url`;
      const referencesUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperId}/references?limit=${limit}&fields=title,year,authors,citationCount,url`;
      
      const [citationsResponse, referencesResponse] = await Promise.all([
        fetch(citationsUrl, { headers: { 'Accept': 'application/json' } }),
        fetch(referencesUrl, { headers: { 'Accept': 'application/json' } }),
      ]);

      if (!citationsResponse.ok || !referencesResponse.ok) {
        throw new Error('Failed to fetch citation network');
      }

      const citationsData = await citationsResponse.json();
      const referencesData = await referencesResponse.json();

      const citations = citationsData.data?.map((item: any) => ({
        title: item.citedPaper?.title || 'Unknown',
        authors: item.citedPaper?.authors?.map((a: any) => a.name).join(', ') || 'Unknown',
        year: item.citedPaper?.year || 'N/A',
        citationCount: item.citedPaper?.citationCount || 0,
        url: item.citedPaper?.url || '',
      })) || [];

      const references = referencesData.data?.map((item: any) => ({
        title: item.citedPaper?.title || 'Unknown',
        authors: item.citedPaper?.authors?.map((a: any) => a.name).join(', ') || 'Unknown',
        year: item.citedPaper?.year || 'N/A',
        citationCount: item.citedPaper?.citationCount || 0,
        url: item.citedPaper?.url || '',
      })) || [];

      console.log(`✅ Found ${citations.length} citations and ${references.length} references`);

      return {
        success: true,
        message: `Found ${citations.length} citing papers and ${references.length} references`,
        citations,
        references,
      };
      
    } catch (error) {
      console.error('Error fetching citation network:', error);
      return {
        success: false,
        message: `Failed to fetch citation network: ${error instanceof Error ? error.message : 'Unknown error'}`,
        citations: [],
        references: [],
      };
    }
  },
});

/**
 * Tool to get paper recommendations
 */
export const getRecommendationsTool = createTool({
  id: 'getRecommendations',
  description: 'Get recommended papers similar to a given paper.',
  inputSchema: z.object({
    paperId: z.string().describe('The Semantic Scholar paper ID'),
    limit: z.number().optional().default(5).describe('Number of recommendations'),
  }),
  execute: async ({ context }) => {
    const { paperId, limit = 5 } = context;
    
    console.log(`💡 Getting recommendations for paper: ${paperId}`);

    try {
      const recommendationsUrl = `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paperId}?limit=${limit}&fields=title,abstract,year,authors,citationCount,url,paperId`;
      
      const response = await fetch(recommendationsUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Semantic Scholar API returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.recommendedPapers || data.recommendedPapers.length === 0) {
        return {
          success: false,
          message: 'No recommendations found for this paper.',
          recommendations: [],
        };
      }

      const recommendations = data.recommendedPapers.map((paper: any) => ({
        title: paper.title || 'Untitled',
        authors: paper.authors?.map((a: any) => a.name).join(', ') || 'Unknown',
        year: paper.year || 'N/A',
        abstract: (paper.abstract || 'No abstract').substring(0, 200) + '...',
        citationCount: paper.citationCount || 0,
        url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        paperId: paper.paperId,
      }));

      console.log(`✅ Found ${recommendations.length} recommendations`);

      return {
        success: true,
        message: `Found ${recommendations.length} recommended papers`,
        recommendations,
      };
      
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return {
        success: false,
        message: `Failed to fetch recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: [],
      };
    }
  },
});

/**
 * Tool to get paper details
 */
export const getPaperDetailsTool = createTool({
  id: 'getPaperDetails',
  description: 'Get detailed information about a specific paper.',
  inputSchema: z.object({
    paperId: z.string().describe('The Semantic Scholar paper ID'),
  }),
  execute: async ({ context }) => {
    const { paperId } = context;
    
    console.log(`📄 Fetching details for paper: ${paperId}`);

    try {
      const detailsUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=title,abstract,year,authors,citationCount,referenceCount,fieldsOfStudy,publicationDate,journal,url`;
      
      const response = await fetch(detailsUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Paper not found: ${response.status}`);
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
 * Tool to search by author
 */
export const searchByAuthorTool = createTool({
  id: 'searchByAuthor',
  description: 'Find papers by a specific author.',
  inputSchema: z.object({
    authorName: z.string().describe('The author name'),
    limit: z.number().optional().default(10).describe('Number of papers to retrieve'),
  }),
  execute: async ({ context }) => {
    const { authorName, limit = 10 } = context;
    
    console.log(`👤 Searching papers by author: "${authorName}"`);

    try {
      const authorSearchUrl = `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(authorName)}&limit=1`;
      
      const authorResponse = await fetch(authorSearchUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (!authorResponse.ok) {
        return {
          success: false,
          message: `Author "${authorName}" not found.`,
          papers: [],
        };
      }

      const authorData = await authorResponse.json();
      
      if (!authorData.data || authorData.data.length === 0) {
        return {
          success: false,
          message: `No author found with name "${authorName}".`,
          papers: [],
        };
      }

      const authorId = authorData.data[0].authorId;
      const papersUrl = `https://api.semanticscholar.org/graph/v1/author/${authorId}/papers?limit=${limit}&fields=title,abstract,year,citationCount,url,paperId`;
      
      const papersResponse = await fetch(papersUrl, {
        headers: { 'Accept': 'application/json' },
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
        url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        paperId: paper.paperId,
      }));

      return {
        success: true,
        message: `Found ${papers.length} papers by ${authorData.data[0].name}`,
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




