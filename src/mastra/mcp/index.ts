import { MCPServer } from "@mastra/mcp"
import { 
  searchPapersTool, 
  getPaperDetailsTool, 
  searchByAuthorTool,
  datasetSearchTool,
  citationNetworkTool,
  getRecommendationsTool
} from '../tools';
import { researchAgent } from "../agents";

export const server = new MCPServer({
  name: "My Custom Server",
  version: "1.0.0",
  tools: { searchPapersTool, getPaperDetailsTool, searchByAuthorTool,datasetSearchTool,
    citationNetworkTool,
    getRecommendationsTool},
  agents: { researchAgent }, // this agent will become tool "ask_weatherAgent"
  // workflows: {
  // dataProcessingWorkflow, // this workflow will become tool "run_dataProcessingWorkflow"
  // }
});
