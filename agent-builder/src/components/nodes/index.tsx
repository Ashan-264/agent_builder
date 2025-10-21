// Node registry - imports all node components and their field configurations
import React from "react";
import { BaseNode } from "./BaseNode";

interface NodeData {
  label: string;
  nodeType: string;
  parameters?: {
    [key: string]: string;
  };
}

interface NodeProps {
  data: NodeData;
  id: string;
}

// Color definitions for each node type
export const nodeColors = {
  Start: { bg: "#1a4a1a", border: "#22c55e", badge: "#22c55e", icon: "▶️" },
  End: { bg: "#4a1a1a", border: "#ef4444", badge: "#ef4444", icon: "⏹️" },
  Input: { bg: "#1e3a5f", border: "#3b82f6", badge: "#3b82f6", icon: "🔵" },
  LLM: { bg: "#3d2463", border: "#a855f7", badge: "#a855f7", icon: "🧠" },
  Tool: { bg: "#4a2c1a", border: "#f97316", badge: "#f97316", icon: "🔧" },
  Memory: { bg: "#1e4a2e", border: "#22c55e", badge: "#22c55e", icon: "💾" },
  Output: { bg: "#4a1e35", border: "#ec4899", badge: "#ec4899", icon: "📤" },
  "Web Scraping": {
    bg: "#1a3a4a",
    border: "#06b6d4",
    badge: "#06b6d4",
    icon: "🌐",
  },
  "LLM JSON Parser": {
    bg: "#2a4a3a",
    border: "#10b981",
    badge: "#10b981",
    icon: "📝",
  },
  "Structured Output": {
    bg: "#3a2a4a",
    border: "#8b5cf6",
    badge: "#8b5cf6",
    icon: "📋",
  },
  "Embedding Generator": {
    bg: "#2a3a4a",
    border: "#3b82f6",
    badge: "#3b82f6",
    icon: "🔢",
  },
  "Similarity Search": {
    bg: "#4a3a2a",
    border: "#f59e0b",
    badge: "#f59e0b",
    icon: "🔍",
  },
  "Text Note": {
    bg: "#4a4419",
    border: "#eab308",
    badge: "#eab308",
    icon: "📝",
  },
};

// Field configurations for each node type
export const nodeFieldConfigs: {
  [key: string]: {
    [key: string]: { name: string; type: string; options?: string[] };
  };
} = {
  Start: {},
  End: {},
  Input: {
    input: { name: "Input", type: "text" },
  },
  LLM: {
    model: {
      name: "Model",
      type: "select",
      options: ["Gemini"],
    },
    systemInstruction: { name: "System Instruction", type: "textarea" },
    userMessage: { name: "User Message", type: "textarea" },
    temperature: { name: "Temperature (0-1)", type: "text" },
    maxOutputTokens: { name: "Max Output Tokens", type: "text" },
    topK: { name: "Top K", type: "text" },
  },
  Tool: {
    endpoint: { name: "Endpoint", type: "text" },
    input: { name: "Input", type: "text" },
  },
  Memory: {
    key: { name: "Key", type: "text" },
    value: { name: "Value", type: "text" },
  },
  Output: {
    message: { name: "Message", type: "text" },
  },
  "Web Scraping": {
    url: { name: "Website URL", type: "text" },
    instruction: { name: "What to Extract", type: "textarea" },
  },
  "LLM JSON Parser": {
    inputText: { name: "Input Text", type: "textarea" },
    schemaDescription: {
      name: "Schema Description (natural language)",
      type: "textarea",
    },
    jsonSchema: { name: "JSON Schema (editable)", type: "textarea" },
  },
  "Structured Output": {
    schema: { name: "JSON Schema", type: "textarea" },
    inputData: { name: "Input Data", type: "textarea" },
  },
  "Embedding Generator": {
    text: { name: "Text to Embed", type: "textarea" },
    source: { name: "Source (optional)", type: "text" },
    info: { name: "Info (optional)", type: "text" },
    tag: { name: "Tag (optional)", type: "text" },
    workflow: { name: "Workflow (optional)", type: "text" },
  },
  "Similarity Search": {
    query: { name: "Search Query", type: "textarea" },
    topK: { name: "Top K Results", type: "text" },
  },
  "Text Note": {
    note: { name: "Note", type: "textarea" },
  },
};

// Individual node components
export const StartNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors.Start} />
);

export const EndNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors.End} />
);

export const InputNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors.Input} />
);

export const LLMNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors.LLM} />
);

export const ToolNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors.Tool} />
);

export const MemoryNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors.Memory} />
);

export const OutputNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors.Output} />
);

export const WebScrapingNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors["Web Scraping"]} />
);

export const LLMJSONParserNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors["LLM JSON Parser"]} />
);

export const StructuredOutputNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors["Structured Output"]} />
);

export const EmbeddingGeneratorNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors["Embedding Generator"]} />
);

export const SimilaritySearchNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors["Similarity Search"]} />
);

export const TextNoteNode: React.FC<NodeProps> = ({ data, id }) => (
  <BaseNode data={data} id={id} colors={nodeColors["Text Note"]} />
);

// Export custom node types for ReactFlow
export const customNodeTypes = {
  Start: StartNode,
  End: EndNode,
  Input: InputNode,
  LLM: LLMNode,
  Tool: ToolNode,
  Memory: MemoryNode,
  Output: OutputNode,
  "Web Scraping": WebScrapingNode,
  "LLM JSON Parser": LLMJSONParserNode,
  "Structured Output": StructuredOutputNode,
  "Embedding Generator": EmbeddingGeneratorNode,
  "Similarity Search": SimilaritySearchNode,
  "Text Note": TextNoteNode,
};

// Helper function to get node color
export const getNodeColor = (nodeType: string) => {
  return (
    nodeColors[nodeType as keyof typeof nodeColors] || {
      bg: "#2d2d2d",
      border: "#666666",
      badge: "#666666",
      icon: "⚙️",
    }
  );
};

// Helper function to get node fields
export const getNodeFields = (nodeType: string) => {
  return nodeFieldConfigs[nodeType] || {};
};
