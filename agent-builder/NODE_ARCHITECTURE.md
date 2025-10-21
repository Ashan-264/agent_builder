# Node Component Architecture

## Overview

The agent builder now uses a modular component architecture where each node type is a separate, reusable component.

## File Structure

```
src/components/
├── AgentBuilder.tsx          # Main component
└── nodes/
    ├── index.tsx              # Central registry for all nodes
    ├── BaseNode.tsx           # Shared base component
    ├── InputNode.tsx          # Input node (deprecated, use index)
    └── LLMNode.tsx            # LLM node (deprecated, use index)
```

## Components

### BaseNode.tsx

The foundation component that all node types use. It handles:

- Visual styling (background, borders, colors)
- Expand button functionality
- Source and target handles for connections
- Event dispatching for configuration modal

### index.tsx

Central registry containing:

- **nodeColors**: Color definitions for all 10 node types
- **nodeFieldConfigs**: Field configurations for each node type
- **Individual Node Components**: One for each node type (Input, LLM, Tool, Memory, Output, Web Scraping, Structured Output, Embedding Generator, Similarity Search, Text Note)
- **customNodeTypes**: Exported object for ReactFlow integration
- **Helper functions**: `getNodeColor()` and `getNodeFields()`

## Node Types

1. **Input** 🔵 - Blue
2. **LLM** 🧠 - Purple
3. **Tool** 🔧 - Orange
4. **Memory** 💾 - Green
5. **Output** 📤 - Pink
6. **Web Scraping** 🌐 - Cyan
7. **Structured Output** 📋 - Violet
8. **Embedding Generator** 🔢 - Blue-gray
9. **Similarity Search** 🔍 - Amber
10. **Text Note** 📝 - Yellow

## Benefits of This Architecture

1. **Modularity**: Each node type is independent and can be modified without affecting others
2. **Maintainability**: Changes to individual nodes don't require editing the main component
3. **Reusability**: BaseNode component reduces code duplication
4. **Scalability**: Easy to add new node types by creating new components
5. **Type Safety**: TypeScript interfaces ensure consistency across all nodes
6. **Separation of Concerns**: Node definitions, field configs, and logic are separated

## How to Add a New Node Type

1. Add node type to `nodeTypes` array in AgentBuilder.tsx
2. Add color configuration to `nodeColors` in nodes/index.tsx
3. Add field configuration to `nodeFieldConfigs` in nodes/index.tsx
4. Create node component function (e.g., `export const NewNode = ...`)
5. Add to `customNodeTypes` export object

## Usage in AgentBuilder

```typescript
import {
  customNodeTypes,
  getNodeColor,
  getNodeFields,
} from "./nodes/index";

// Use in ReactFlow
<ReactFlow nodeTypes={customNodeTypes} ... />

// Get node colors for minimap
const colors = getNodeColor(node.data.nodeType);

// Get field configuration for parameter modal
const fields = getNodeFields(node.data.nodeType);
```

## Key Changes from Original

- Removed monolithic `CustomNode` component
- Removed inline color and field definitions
- Split functionality into separate, focused modules
- Node type now matches node name (e.g., `type: "LLM"` instead of `type: "custom"`)
- All nodes share the same BaseNode rendering logic
