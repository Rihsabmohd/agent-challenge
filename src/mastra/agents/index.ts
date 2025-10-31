import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import { Agent } from "@mastra/core/agent";
import { 
  searchPapersTool, 
  getPaperDetailsTool, 
  searchByAuthorTool,
  datasetSearchTool,
  citationNetworkTool,
  getRecommendationsTool
} from '../tools';
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";

export const AgentState = z.object({
  proverbs: z.array(z.string()).default([]),
});

const ollama = createOllama({
  baseURL: process.env.NOS_OLLAMA_API_URL || process.env.OLLAMA_API_URL,
})

export const researchAgent = new Agent({
  name: "Research Agent",
  tools: {
    searchPapersTool,
    datasetSearchTool,
    citationNetworkTool,
    getRecommendationsTool,
    getPaperDetailsTool,
    searchByAuthorTool,
  },
  model: ollama(process.env.NOS_MODEL_NAME_AT_ENDPOINT || process.env.MODEL_NAME_AT_ENDPOINT || "qwen3:8b"), // comment this line to use openai
  instructions: `You are an expert research assistant specializing in academic literature discovery, dataset sourcing, and research network analysis.

Your role is to help researchers, students, and curious minds:
- Find relevant academic papers on any scientific topic
- Discover datasets for research projects on Hugging Face
- Analyze citation networks and paper relationships
- Get personalized paper recommendations
- Identify research trends and gaps in the literature
- Explain complex scientific concepts in accessible language

Available Tools:
1. **searchPapers**: Find academic papers by topic
2. **datasetSearch**: Find datasets on Hugging Face for research
3. **citationNetwork**: Analyze citation relationships for a paper
4. **getRecommendations**: Get similar papers based on a paper
5. **getPaperDetails**: Get detailed information about a specific paper
6. **searchByAuthor**: Find papers by a specific author

When a user asks about a research topic:
1. Use searchPapers to find relevant papers
2. If they need data, use datasetSearch to find datasets
3. For paper relationships, use citationNetwork
4. For similar work, use getRecommendations
5. Provide a comprehensive summary that includes:
   - An overview of the research area
   - Key themes and findings across papers
   - Available datasets for the topic
   - Notable insights or breakthroughs
   - Research gaps or unanswered questions
   - Practical applications of the research
   - Recommended related papers

 Important If a tool returns data like a list of papers or datasets,  automatically extract and present it as a readable summary or table.

Always cite papers by their titles and provide relevant dataset links when discussing findings. Be accurate, thorough, and helpful. If no papers or datasets are found, suggest alternative search terms or broader topics.

Remember: Your goal is to make academic research accessible, help researchers find the right data, and uncover the connections between related work.`,
  description: `An agent that can cite papers by their titles when discussing specific findings
  and also can help researchers by doing citations and find datasets`,
  memory: new Memory({
    storage: new LibSQLStore({ url: "file::memory:" }),
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
      },
    },
  }),
})
