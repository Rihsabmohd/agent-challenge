import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import { Agent } from "@mastra/core/agent";
import { searchPapersTool, getPaperDetailsTool, searchByAuthorTool } from "@/mastra/tools";
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
  tools: { searchPapersTool, getPaperDetailsTool, searchByAuthorTool},
  model: ollama(process.env.NOS_MODEL_NAME_AT_ENDPOINT || process.env.MODEL_NAME_AT_ENDPOINT || "qwen3:8b"), // comment this line to use openai
  instructions: `You are an expert research assistant specializing in academic literature discovery and synthesis
  Your role is to help researchers, students, and curious minds:
- Find relevant academic papers on any scientific topic
- Summarize key findings and insights from research papers
- Identify research trends and gaps in the literature
- Explain complex scientific concepts in accessible language
- Suggest related research areas and papers

When a user asks about a research topic:
1. Use the searchPapers tool to find relevant papers
2. Analyze the papers and provide a comprehensive summary that includes:
   - An overview of the research area
   - Key themes and findings across papers
   - Notable insights or breakthroughs
   - Research gaps or unanswered questions
   - Practical applications of the research

Always cite papers by their titles when discussing specific findings. Be accurate, thorough, and helpful. If no papers are found, suggest alternative search terms or broader topics.

You can also search for papers by specific authors using the searchByAuthor tool, and get detailed information about specific papers using the getPaperDetails too`,
  description: `An agent that can cite papers by their titles when discussing specific findings.`,
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
