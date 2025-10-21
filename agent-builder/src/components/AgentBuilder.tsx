"use client";

import React, { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { customNodeTypes, getNodeColor, getNodeFields } from "./nodes/index";

interface NodeData {
  label: string;
  nodeType: string;
  parameters?: {
    [key: string]: string;
  };
  [key: string]: unknown;
}

type NodeTypeOption = {
  value: string;
  label: string;
  description: string;
};

const nodeTypes: NodeTypeOption[] = [
  { value: "Start", label: "Start", description: "Entry point of flow" },
  { value: "End", label: "End", description: "Exit point of flow" },
  { value: "Input", label: "Input", description: "Start the flow" },
  { value: "LLM", label: "LLM", description: "Reason / generate" },
  { value: "Tool", label: "Tool", description: "Act / execute" },
  { value: "Memory", label: "Memory", description: "Remember context" },
  { value: "Output", label: "Output", description: "End the flow" },
  {
    value: "Web Scraping",
    label: "Web Scraping",
    description: "Scrape & summarize website",
  },
  {
    value: "Structured Output",
    label: "Structured Output",
    description: "LLM schema parser",
  },
  {
    value: "Embedding Generator",
    label: "Embedding Generator",
    description: "Create vector embeddings",
  },
  {
    value: "Similarity Search",
    label: "Similarity Search",
    description: "Query vector store",
  },
  { value: "Text Note", label: "Text Note", description: "Simple text note" },
];

const initialNodes: Node<NodeData>[] = [];
const initialEdges: Edge[] = [];

export default function AgentBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [nodeName, setNodeName] = useState("");
  const [selectedNodeType, setSelectedNodeType] = useState<string>("");
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [nodeParameters, setNodeParameters] = useState<{
    [key: string]: string;
  }>({});
  const [testOutput, setTestOutput] = useState<string>("");
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [logMessages, setLogMessages] = useState<
    Array<{ nodeId: string; nodeName: string; output: string; timestamp: Date }>
  >([]);
  const [showLogs, setShowLogs] = useState(true);
  const nodeIdRef = useRef(0);

  // Handle keyboard delete for nodes and edges
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        // Don't delete if user is typing in an input field
        const target = event.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        // Delete selected nodes
        setNodes((nds) => nds.filter((node) => !node.selected));
        // Delete edges connected to deleted nodes or selected edges
        setEdges((eds) =>
          eds.filter((edge) => {
            const sourceExists = nodes.some(
              (n) => n.id === edge.source && !n.selected
            );
            const targetExists = nodes.some(
              (n) => n.id === edge.target && !n.selected
            );
            return sourceExists && targetExists && !edge.selected;
          })
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [nodes, setNodes, setEdges]);

  const getNodeId = () => {
    const id = nodeIdRef.current;
    nodeIdRef.current += 1;
    return `node_${id}`;
  };

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      // Remove any existing outgoing connection from the source node
      // This ensures each node can only connect to one other node
      setEdges((eds) => {
        const filteredEdges = eds.filter((e) => e.source !== params.source);

        const edge = {
          ...params,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "white",
          },
          style: {
            stroke: "white",
            strokeWidth: 2,
          },
        };

        return addEdge(edge, filteredEdges);
      });
    },
    [setEdges]
  );

  const addNode = (nodeType: string) => {
    if (!nodeType) return;

    const id = getNodeId();
    const newNode: Node<NodeData> = {
      id: id,
      type: nodeType,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        label: `Node ${nodeIdRef.current}`,
        nodeType: nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeType("");
  };

  // Listen for expand events
  React.useEffect(() => {
    const handleExpandNode = (e: CustomEvent) => {
      const nodeId = e.detail.nodeId;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setExpandedNode(nodeId);
        setNodeParameters(node.data.parameters || {});
      }
    };

    window.addEventListener("expandNode", handleExpandNode as EventListener);
    return () => {
      window.removeEventListener(
        "expandNode",
        handleExpandNode as EventListener
      );
    };
  }, [nodes]);

  const updateNodeParameters = () => {
    if (expandedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === expandedNode) {
            return {
              ...node,
              data: { ...node.data, parameters: nodeParameters },
            };
          }
          return node;
        })
      );
    }
    setExpandedNode(null);
    setNodeParameters({});
  };

  const cancelParameterEdit = () => {
    setExpandedNode(null);
    setNodeParameters({});
    setTestOutput("");
  };

  const testLLMNode = async () => {
    setIsTestLoading(true);
    setTestOutput("");
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: nodeParameters.systemInstruction || "",
          userMessage: nodeParameters.userMessage || "",
          temperature: nodeParameters.temperature || "0.7",
          maxOutputTokens: nodeParameters.maxOutputTokens || "1024",
          topK: nodeParameters.topK || "40",
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTestOutput(data.output);
      } else {
        setTestOutput(`Error: ${data.error || "Failed to get response"}`);
      }
    } catch (error) {
      setTestOutput(`Error: ${(error as Error).message}`);
    } finally {
      setIsTestLoading(false);
    }
  };

  const testWebScrapingNode = async () => {
    setIsTestLoading(true);
    setTestOutput("");
    try {
      const response = await fetch("/api/web-scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: nodeParameters.url || "",
          instruction: nodeParameters.instruction || "",
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Display the extracted data
        let output = `✅ Extraction Complete\n\n`;
        output += `URL: ${data.url}\n`;
        output += `Instruction: ${data.instruction}\n\n`;
        output += `--- Extracted Data ---\n`;
        output += JSON.stringify(data.data, null, 2);

        setTestOutput(output);
      } else {
        setTestOutput(
          `Error: ${data.error || data.details || "Failed to extract data"}`
        );
      }
    } catch (error) {
      setTestOutput(`Error: ${(error as Error).message}`);
    } finally {
      setIsTestLoading(false);
    }
  };

  const testEmbeddingGeneratorNode = async () => {
    setIsTestLoading(true);
    setTestOutput("");
    try {
      const response = await fetch("/api/pinecone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "embed",
          text: nodeParameters.text || "",
          source: nodeParameters.source || "",
          info: nodeParameters.info || "",
          tag: nodeParameters.tag || "",
          workflow: nodeParameters.workflow || "",
          nodeId: expandedNode || "",
        }),
      });

      const data = await response.json();
      if (response.ok) {
        let output = `✅ Embedding Generated & Stored\n\n`;
        output += `ID: ${data.id}\n`;
        output += `Dimension: ${data.dimension}\n\n`;
        output += `--- Metadata ---\n`;
        output += JSON.stringify(data.metadata, null, 2);

        setTestOutput(output);
      } else {
        setTestOutput(
          `Error: ${
            data.error || data.details || "Failed to generate embedding"
          }`
        );
      }
    } catch (error) {
      setTestOutput(`Error: ${(error as Error).message}`);
    } finally {
      setIsTestLoading(false);
    }
  };

  const testSimilaritySearchNode = async () => {
    setIsTestLoading(true);
    setTestOutput("");
    try {
      const response = await fetch("/api/pinecone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "search",
          query: nodeParameters.query || "",
          topK: nodeParameters.topK || "5",
        }),
      });

      const data = await response.json();
      if (response.ok) {
        let output = `✅ Similarity Search Complete\n\n`;
        output += `Query: ${data.query}\n`;
        output += `Results Found: ${data.resultsCount}\n\n`;
        output += `--- Top ${data.topK} Matches ---\n\n`;

        data.matches.forEach(
          (
            match: {
              score: number;
              text: string;
              source?: string;
              tag?: string;
            },
            index: number
          ) => {
            output += `${index + 1}. Score: ${match.score.toFixed(4)}\n`;
            output += `   Text: ${match.text.substring(0, 100)}...\n`;
            if (match.source) output += `   Source: ${match.source}\n`;
            if (match.tag) output += `   Tag: ${match.tag}\n`;
            output += `\n`;
          }
        );

        setTestOutput(output);
      } else {
        setTestOutput(
          `Error: ${data.error || data.details || "Failed to search"}`
        );
      }
    } catch (error) {
      setTestOutput(`Error: ${(error as Error).message}`);
    } finally {
      setIsTestLoading(false);
    }
  };

  // Function to traverse the graph and get execution order
  const getExecutionOrder = (): Node<NodeData>[] | null => {
    // Find Start node
    const startNode = nodes.find((n) => n.data.nodeType === "Start");
    if (!startNode) {
      return null;
    }

    // Find End node
    const endNode = nodes.find((n) => n.data.nodeType === "End");
    if (!endNode) {
      return null;
    }

    // Build adjacency map
    const adjacencyMap = new Map<string, string>();
    edges.forEach((edge) => {
      adjacencyMap.set(edge.source, edge.target);
    });

    // Traverse from Start to End
    const executionOrder: Node<NodeData>[] = [];
    let currentNodeId: string | undefined = startNode.id;

    while (currentNodeId) {
      const currentNode = nodes.find((n) => n.id === currentNodeId);
      if (!currentNode) break;

      executionOrder.push(currentNode);

      // If we reached the End node, stop
      if (currentNode.data.nodeType === "End") {
        break;
      }

      // Get next node
      currentNodeId = adjacencyMap.get(currentNodeId);
    }

    // Check if we reached the End node
    const lastNode = executionOrder[executionOrder.length - 1];
    if (!lastNode || lastNode.data.nodeType !== "End") {
      return null;
    }

    return executionOrder;
  };

  const runFlow = async () => {
    setLogMessages([]);

    // Get execution order from graph traversal
    const executionOrder = getExecutionOrder();

    // Validate flow
    if (!executionOrder) {
      const timestamp = new Date();
      setLogMessages([
        {
          nodeId: "system",
          nodeName: "System",
          output:
            "❌ Error: Flow validation failed. Make sure you have:\n1. A Start node\n2. An End node\n3. All nodes connected in a path from Start to End",
          timestamp,
        },
      ]);
      return;
    }

    // Log flow start
    const startTimestamp = new Date();
    setLogMessages([
      {
        nodeId: "system",
        nodeName: "System",
        output: `▶️ Flow execution started with ${executionOrder.length} nodes`,
        timestamp: startTimestamp,
      },
    ]);

    // Execute nodes in order
    for (const node of executionOrder) {
      const timestamp = new Date();

      // Skip Start and End nodes (they are just markers)
      if (node.data.nodeType === "Start") {
        setLogMessages((prev) => [
          ...prev,
          {
            nodeId: node.id,
            nodeName: node.data.label as string,
            output: "▶️ Starting flow execution...",
            timestamp,
          },
        ]);
        continue;
      }

      if (node.data.nodeType === "End") {
        setLogMessages((prev) => [
          ...prev,
          {
            nodeId: node.id,
            nodeName: node.data.label as string,
            output: "⏹️ Flow execution completed successfully",
            timestamp,
          },
        ]);
        continue;
      }

      // Execute LLM nodes
      if (node.data.nodeType === "LLM") {
        const params = node.data.parameters as { [key: string]: string };

        try {
          const response = await fetch("/api/gemini", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: params?.systemInstruction || "",
              userMessage: params?.userMessage || "",
              temperature: params?.temperature || "0.7",
              maxOutputTokens: params?.maxOutputTokens || "1024",
              topK: params?.topK || "40",
            }),
          });

          const data = await response.json();
          if (response.ok) {
            setLogMessages((prev) => [
              ...prev,
              {
                nodeId: node.id,
                nodeName: node.data.label as string,
                output: data.output,
                timestamp,
              },
            ]);
          } else {
            const errorMsg = `Error: ${data.error || "Failed to get response"}`;
            setLogMessages((prev) => [
              ...prev,
              {
                nodeId: node.id,
                nodeName: node.data.label as string,
                output: errorMsg,
                timestamp,
              },
            ]);
            // Stop execution on error
            return;
          }
        } catch (error) {
          const errorMsg = `Error: ${(error as Error).message}`;
          setLogMessages((prev) => [
            ...prev,
            {
              nodeId: node.id,
              nodeName: node.data.label as string,
              output: errorMsg,
              timestamp,
            },
          ]);
          // Stop execution on error
          return;
        }
      }

      // Execute Web Scraping nodes
      if (node.data.nodeType === "Web Scraping") {
        const params = node.data.parameters as { [key: string]: string };

        try {
          const response = await fetch("/api/web-scrape", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: params?.url || "",
              instruction: params?.instruction || "",
            }),
          });

          const data = await response.json();
          if (response.ok) {
            let output = `✅ Extraction Complete\n\n`;
            output += `URL: ${data.url}\n`;
            output += `Instruction: ${data.instruction}\n\n`;
            output += `--- Extracted Data ---\n`;
            output += JSON.stringify(data.data, null, 2);

            setLogMessages((prev) => [
              ...prev,
              {
                nodeId: node.id,
                nodeName: node.data.label as string,
                output: output,
                timestamp,
              },
            ]);
          } else {
            const errorMsg = `Error: ${
              data.error || data.details || "Failed to extract data"
            }`;
            setLogMessages((prev) => [
              ...prev,
              {
                nodeId: node.id,
                nodeName: node.data.label as string,
                output: errorMsg,
                timestamp,
              },
            ]);
            // Stop execution on error
            return;
          }
        } catch (error) {
          const errorMsg = `Error: ${(error as Error).message}`;
          setLogMessages((prev) => [
            ...prev,
            {
              nodeId: node.id,
              nodeName: node.data.label as string,
              output: errorMsg,
              timestamp,
            },
          ]);
          // Stop execution on error
          return;
        }
      }

      // Execute Embedding Generator nodes
      if (node.data.nodeType === "Embedding Generator") {
        const params = node.data.parameters as { [key: string]: string };

        try {
          const response = await fetch("/api/pinecone", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "embed",
              text: params?.text || "",
              source: params?.source || "",
              info: params?.info || "",
              tag: params?.tag || "",
              workflow: params?.workflow || "",
              nodeId: node.id,
            }),
          });

          const data = await response.json();
          if (response.ok) {
            let output = `✅ Embedding Generated & Stored\n\n`;
            output += `ID: ${data.id}\n`;
            output += `Dimension: ${data.dimension}\n\n`;
            output += `--- Metadata ---\n`;
            output += JSON.stringify(data.metadata, null, 2);

            setLogMessages((prev) => [
              ...prev,
              {
                nodeId: node.id,
                nodeName: node.data.label as string,
                output: output,
                timestamp,
              },
            ]);
          } else {
            const errorMsg = `Error: ${
              data.error || data.details || "Failed to generate embedding"
            }`;
            setLogMessages((prev) => [
              ...prev,
              {
                nodeId: node.id,
                nodeName: node.data.label as string,
                output: errorMsg,
                timestamp,
              },
            ]);
            // Stop execution on error
            return;
          }
        } catch (error) {
          const errorMsg = `Error: ${(error as Error).message}`;
          setLogMessages((prev) => [
            ...prev,
            {
              nodeId: node.id,
              nodeName: node.data.label as string,
              output: errorMsg,
              timestamp,
            },
          ]);
          // Stop execution on error
          return;
        }
      }

      // Execute Similarity Search nodes
      if (node.data.nodeType === "Similarity Search") {
        const params = node.data.parameters as { [key: string]: string };

        try {
          const response = await fetch("/api/pinecone", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "search",
              query: params?.query || "",
              topK: params?.topK || "5",
            }),
          });

          const data = await response.json();
          if (response.ok) {
            let output = `✅ Similarity Search Complete\n\n`;
            output += `Query: ${data.query}\n`;
            output += `Results Found: ${data.resultsCount}\n\n`;
            output += `--- Top ${data.topK} Matches ---\n\n`;

            data.matches.forEach(
              (
                match: {
                  score: number;
                  text: string;
                  source?: string;
                  tag?: string;
                },
                index: number
              ) => {
                output += `${index + 1}. Score: ${match.score.toFixed(4)}\n`;
                output += `   Text: ${match.text.substring(0, 100)}...\n`;
                if (match.source) output += `   Source: ${match.source}\n`;
                if (match.tag) output += `   Tag: ${match.tag}\n`;
                output += `\n`;
              }
            );

            setLogMessages((prev) => [
              ...prev,
              {
                nodeId: node.id,
                nodeName: node.data.label as string,
                output: output,
                timestamp,
              },
            ]);
          } else {
            const errorMsg = `Error: ${
              data.error || data.details || "Failed to search"
            }`;
            setLogMessages((prev) => [
              ...prev,
              {
                nodeId: node.id,
                nodeName: node.data.label as string,
                output: errorMsg,
                timestamp,
              },
            ]);
            // Stop execution on error
            return;
          }
        } catch (error) {
          const errorMsg = `Error: ${(error as Error).message}`;
          setLogMessages((prev) => [
            ...prev,
            {
              nodeId: node.id,
              nodeName: node.data.label as string,
              output: errorMsg,
              timestamp,
            },
          ]);
          // Stop execution on error
          return;
        }
      }
    }
  };

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setEditingNode(node.id);
      setNodeName(node.data.label as string);
    },
    []
  );

  const updateNodeName = () => {
    if (editingNode && nodeName.trim()) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNode) {
            return {
              ...node,
              data: { ...node.data, label: nodeName },
            };
          }
          return node;
        })
      );
    }
    setEditingNode(null);
    setNodeName("");
  };

  const cancelEdit = () => {
    setEditingNode(null);
    setNodeName("");
  };

  // Export workflow to JSON
  const exportWorkflow = () => {
    const workflow = {
      nodes: nodes,
      edges: edges,
      nodeIdCounter: nodeIdRef.current,
      version: "1.0",
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(workflow, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workflow_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Log success
    const timestamp = new Date();
    setLogMessages((prev) => [
      ...prev,
      {
        nodeId: "system",
        nodeName: "System",
        output: `✅ Workflow exported successfully with ${nodes.length} nodes and ${edges.length} connections`,
        timestamp,
      },
    ]);
  };

  // Import workflow from JSON
  const importWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const workflow = JSON.parse(content);

        // Validate workflow structure
        if (!workflow.nodes || !workflow.edges) {
          throw new Error("Invalid workflow file format");
        }

        // Load nodes and edges
        setNodes(workflow.nodes);
        setEdges(workflow.edges);
        
        // Update node ID counter to avoid ID conflicts
        if (workflow.nodeIdCounter !== undefined) {
          nodeIdRef.current = workflow.nodeIdCounter;
        }

        // Log success
        const timestamp = new Date();
        setLogMessages([
          {
            nodeId: "system",
            nodeName: "System",
            output: `✅ Workflow imported successfully: ${workflow.nodes.length} nodes and ${workflow.edges.length} connections loaded`,
            timestamp,
          },
        ]);
      } catch (error) {
        const timestamp = new Date();
        setLogMessages([
          {
            nodeId: "system",
            nodeName: "System",
            output: `❌ Failed to import workflow: ${(error as Error).message}`,
            timestamp,
          },
        ]);
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  return (
    <div style={{ width: "100%", height: "100vh", background: "#0a0a0a" }}>
      <style>{`
        .react-flow__node-default {
          background: #2d2d2d;
          border: 1px solid #444;
          border-radius: 8px;
          color: #e5e5e5;
          font-size: 12px;
          padding: 10px;
        }
        .react-flow__node-default .react-flow__handle {
          background: #666;
        }
        .react-flow__controls {
          background: rgba(20, 20, 20, 0.9);
          border: 1px solid #333;
          border-radius: 8px;
        }
        .react-flow__controls button {
          background: rgba(40, 40, 40, 0.9);
          border-bottom: 1px solid #333;
          color: #e5e5e5;
        }
        .react-flow__controls button:hover {
          background: rgba(60, 60, 60, 0.9);
        }
        .react-flow__minimap {
          background: rgba(20, 20, 20, 0.9);
          border: 1px solid #333;
          border-radius: 8px;
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          top: 15,
          left: 15,
          zIndex: 4,
          background: "rgba(20, 20, 20, 0.95)",
          padding: "15px",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
          minWidth: "280px",
          border: "1px solid #333",
        }}
      >
        <label
          style={{
            display: "block",
            marginBottom: "10px",
            fontSize: "15px",
            fontWeight: "600",
            color: "#e5e5e5",
            letterSpacing: "0.5px",
          }}
        >
          Add Node
        </label>
        <select
          value={selectedNodeType}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedNodeType(value);
            if (value) {
              addNode(value);
            }
          }}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #444",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer",
            backgroundColor: "#1a1a1a",
            color: "#e5e5e5",
            outline: "none",
          }}
        >
          <option value="">Select Node Type...</option>
          {nodeTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label} - {type.description}
            </option>
          ))}
        </select>
        <div style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#888" }}>
          <p style={{ margin: "5px 0" }}>
            • Double-click a node to edit its name
          </p>
          <p style={{ margin: "5px 0" }}>
            • Select and press Delete to remove nodes/edges
          </p>
          <p style={{ margin: "5px 0" }}>
            • Reconnect nodes to reroute connections
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          position: "absolute",
          top: 15,
          left: 310,
          zIndex: 100,
          display: "flex",
          gap: "10px",
        }}
      >
        <button
          onClick={runFlow}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.4)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 16px rgba(34, 197, 94, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 12px rgba(34, 197, 94, 0.4)";
          }}
        >
          ▶ Run Flow
        </button>

        <button
          onClick={exportWorkflow}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 16px rgba(59, 130, 246, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 12px rgba(59, 130, 246, 0.4)";
          }}
        >
          💾 Export
        </button>

        <label
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)",
            transition: "all 0.2s",
            display: "inline-block",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 16px rgba(139, 92, 246, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 12px rgba(139, 92, 246, 0.4)";
          }}
        >
          📂 Import
          <input
            type="file"
            accept=".json"
            onChange={importWorkflow}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {editingNode && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              zIndex: 9,
              backdropFilter: "blur(4px)",
            }}
            onClick={cancelEdit}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              background: "#1a1a1a",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.8)",
              minWidth: "350px",
              border: "1px solid #333",
            }}
          >
            <h3
              style={{
                margin: "0 0 18px 0",
                fontSize: "18px",
                color: "#e5e5e5",
                fontWeight: "600",
              }}
            >
              Edit Node Name
            </h3>
            <input
              type="text"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  updateNodeName();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
              placeholder="Enter node name..."
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #444",
                borderRadius: "6px",
                fontSize: "14px",
                marginBottom: "16px",
                boxSizing: "border-box",
                color: "#e5e5e5",
                backgroundColor: "#0a0a0a",
                outline: "none",
              }}
              autoFocus
            />
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={cancelEdit}
                style={{
                  padding: "10px 18px",
                  background: "#2d2d2d",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#e5e5e5",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={updateNodeName}
                style={{
                  padding: "10px 18px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}

      {expandedNode &&
        (() => {
          const node = nodes.find((n) => n.id === expandedNode);
          if (!node) return null;
          const fields = getNodeFields(node.data.nodeType as string);

          return (
            <>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.75)",
                  zIndex: 9,
                  backdropFilter: "blur(4px)",
                }}
                onClick={cancelParameterEdit}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                  background: "#1a1a1a",
                  padding: "24px",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.8)",
                  minWidth: "450px",
                  maxWidth: "550px",
                  maxHeight: "80vh",
                  overflow: "auto",
                  border: "1px solid #333",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 20px 0",
                    fontSize: "18px",
                    color: "#e5e5e5",
                    fontWeight: "600",
                  }}
                >
                  Configure {node.data.nodeType} Node - {node.data.label}
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                  }}
                >
                  {Object.entries(fields).map(([fieldKey, fieldConfig]) => (
                    <div key={fieldKey}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#b0b0b0",
                        }}
                      >
                        {fieldConfig.name}
                      </label>
                      {fieldConfig.type === "select" ? (
                        <select
                          value={nodeParameters[fieldKey] || ""}
                          onChange={(e) =>
                            setNodeParameters({
                              ...nodeParameters,
                              [fieldKey]: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #444",
                            borderRadius: "6px",
                            fontSize: "14px",
                            backgroundColor: "#0a0a0a",
                            color: "#e5e5e5",
                            outline: "none",
                          }}
                        >
                          <option value="">Select {fieldConfig.name}...</option>
                          {fieldConfig.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : fieldConfig.type === "textarea" ? (
                        <textarea
                          value={nodeParameters[fieldKey] || ""}
                          onChange={(e) =>
                            setNodeParameters({
                              ...nodeParameters,
                              [fieldKey]: e.target.value,
                            })
                          }
                          placeholder={`Enter ${fieldConfig.name.toLowerCase()}...`}
                          rows={4}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #444",
                            borderRadius: "6px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                            color: "#e5e5e5",
                            backgroundColor: "#0a0a0a",
                            resize: "vertical",
                            outline: "none",
                            fontFamily: "inherit",
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={nodeParameters[fieldKey] || ""}
                          onChange={(e) =>
                            setNodeParameters({
                              ...nodeParameters,
                              [fieldKey]: e.target.value,
                            })
                          }
                          placeholder={`Enter ${fieldConfig.name.toLowerCase()}...`}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #444",
                            borderRadius: "6px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                            color: "#e5e5e5",
                            backgroundColor: "#0a0a0a",
                            outline: "none",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Test button for LLM nodes */}
                {node.data.nodeType === "LLM" && (
                  <div style={{ marginTop: "20px" }}>
                    <button
                      onClick={testLLMNode}
                      disabled={isTestLoading}
                      style={{
                        width: "100%",
                        padding: "10px 18px",
                        background: "#a855f7",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isTestLoading ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        opacity: isTestLoading ? 0.6 : 1,
                      }}
                    >
                      {isTestLoading ? "Testing..." : "🧪 Test Node"}
                    </button>

                    {testOutput && (
                      <div
                        style={{
                          marginTop: "15px",
                          padding: "12px",
                          background: "#0a0a0a",
                          border: "1px solid #444",
                          borderRadius: "6px",
                          maxHeight: "200px",
                          overflow: "auto",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#a855f7",
                            marginBottom: "8px",
                          }}
                        >
                          Test Output:
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#e5e5e5",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {testOutput}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Test button for Web Scraping nodes */}
                {node.data.nodeType === "Web Scraping" && (
                  <div style={{ marginTop: "20px" }}>
                    <button
                      onClick={testWebScrapingNode}
                      disabled={isTestLoading}
                      style={{
                        width: "100%",
                        padding: "10px 18px",
                        background: "#06b6d4",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isTestLoading ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        opacity: isTestLoading ? 0.6 : 1,
                      }}
                    >
                      {isTestLoading ? "Scraping..." : "🧪 Test Scrape"}
                    </button>

                    {testOutput && (
                      <div
                        style={{
                          marginTop: "15px",
                          padding: "12px",
                          background: "#0a0a0a",
                          border: "1px solid #444",
                          borderRadius: "6px",
                          maxHeight: "200px",
                          overflow: "auto",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#06b6d4",
                            marginBottom: "8px",
                          }}
                        >
                          Test Output:
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#e5e5e5",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {testOutput}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Test button for Embedding Generator nodes */}
                {node.data.nodeType === "Embedding Generator" && (
                  <div style={{ marginTop: "20px" }}>
                    <button
                      onClick={testEmbeddingGeneratorNode}
                      disabled={isTestLoading}
                      style={{
                        width: "100%",
                        padding: "10px 18px",
                        background: "#64748b",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isTestLoading ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        opacity: isTestLoading ? 0.6 : 1,
                      }}
                    >
                      {isTestLoading ? "Generating..." : "🧪 Test Embed"}
                    </button>

                    {testOutput && (
                      <div
                        style={{
                          marginTop: "15px",
                          padding: "12px",
                          background: "#0a0a0a",
                          border: "1px solid #444",
                          borderRadius: "6px",
                          maxHeight: "200px",
                          overflow: "auto",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#64748b",
                            marginBottom: "8px",
                          }}
                        >
                          Test Output:
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#e5e5e5",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {testOutput}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Test button for Similarity Search nodes */}
                {node.data.nodeType === "Similarity Search" && (
                  <div style={{ marginTop: "20px" }}>
                    <button
                      onClick={testSimilaritySearchNode}
                      disabled={isTestLoading}
                      style={{
                        width: "100%",
                        padding: "10px 18px",
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isTestLoading ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        opacity: isTestLoading ? 0.6 : 1,
                      }}
                    >
                      {isTestLoading ? "Searching..." : "🧪 Test Search"}
                    </button>

                    {testOutput && (
                      <div
                        style={{
                          marginTop: "15px",
                          padding: "12px",
                          background: "#0a0a0a",
                          border: "1px solid #444",
                          borderRadius: "6px",
                          maxHeight: "200px",
                          overflow: "auto",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#f59e0b",
                            marginBottom: "8px",
                          }}
                        >
                          Test Output:
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#e5e5e5",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {testOutput}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                    marginTop: "20px",
                  }}
                >
                  <button
                    onClick={cancelParameterEdit}
                    style={{
                      padding: "10px 18px",
                      background: "#2d2d2d",
                      border: "1px solid #444",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#e5e5e5",
                      fontWeight: "500",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateNodeParameters}
                    style={{
                      padding: "10px 18px",
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Save Parameters
                  </button>
                </div>
              </div>
            </>
          );
        })()}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={customNodeTypes}
        connectionMode={ConnectionMode.Loose}
        connectOnClick={false}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        edgesFocusable={true}
        edgesReconnectable={true}
        fitView
        deleteKeyCode="Delete"
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          style: { stroke: "#666", strokeWidth: 2 },
        }}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const colors = getNodeColor(node.data.nodeType as string);
            return colors.border;
          }}
          maskColor="rgba(10, 10, 10, 0.8)"
          style={{
            backgroundColor: "rgba(20, 20, 20, 0.9)",
          }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#222"
          style={{ backgroundColor: "#0a0a0a" }}
        />
      </ReactFlow>

      {/* Right side log panel */}
      <div
        style={{
          position: "absolute",
          top: 15,
          right: showLogs ? 15 : -385,
          width: "370px",
          height: "calc(100vh - 30px)",
          background: "rgba(20, 20, 20, 0.95)",
          border: "1px solid #333",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
          transition: "right 0.3s ease",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "15px",
            borderBottom: "1px solid #333",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "600",
              color: "#e5e5e5",
            }}
          >
            📋 Execution Logs
          </h3>
          <button
            onClick={() => setShowLogs(!showLogs)}
            style={{
              background: "transparent",
              border: "1px solid #444",
              borderRadius: "4px",
              color: "#e5e5e5",
              cursor: "pointer",
              padding: "4px 8px",
              fontSize: "14px",
            }}
          >
            {showLogs ? "→" : "←"}
          </button>
        </div>

        {/* Logs content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "15px",
          }}
        >
          {logMessages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#666",
                fontSize: "14px",
                marginTop: "40px",
              }}
            >
              No logs yet. Click &quot;Run Flow&quot; to execute.
            </div>
          ) : (
            logMessages.map((log, index) => (
              <div
                key={index}
                style={{
                  background: "#0a0a0a",
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#a855f7",
                    }}
                  >
                    {log.nodeName}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#666",
                    }}
                  >
                    {log.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#e5e5e5",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: "150px",
                    overflow: "auto",
                  }}
                >
                  {log.output}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Clear logs button */}
        {logMessages.length > 0 && (
          <div
            style={{
              padding: "15px",
              borderTop: "1px solid #333",
            }}
          >
            <button
              onClick={() => setLogMessages([])}
              style={{
                width: "100%",
                padding: "8px",
                background: "#2d2d2d",
                border: "1px solid #444",
                borderRadius: "6px",
                color: "#e5e5e5",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Clear Logs
            </button>
          </div>
        )}
      </div>

      {/* Toggle button when panel is hidden */}
      {!showLogs && (
        <button
          onClick={() => setShowLogs(true)}
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            zIndex: 5,
            padding: "10px 14px",
            background: "rgba(20, 20, 20, 0.95)",
            border: "1px solid #333",
            borderRadius: "8px",
            color: "#e5e5e5",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
          }}
        >
          📋 Logs
        </button>
      )}
    </div>
  );
}
