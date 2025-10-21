import React from "react";
import { Handle, Position } from "@xyflow/react";

interface NodeData {
  label: string;
  nodeType: string;
  parameters?: {
    [key: string]: string;
  };
}

interface LLMNodeProps {
  data: NodeData;
  id: string;
}

const getNodeColor = () => ({
  bg: "#3d2463",
  border: "#a855f7",
  badge: "#a855f7",
  icon: "🧠",
});

export const LLMNode: React.FC<LLMNodeProps> = ({ data, id }) => {
  const colors = getNodeColor();

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const event = new CustomEvent("expandNode", { detail: { nodeId: id } });
    window.dispatchEvent(event);
  };

  return (
    <div
      style={{
        position: "relative",
        minWidth: "180px",
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: "12px",
        padding: "25px 15px 15px 15px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        style={{
          background: colors.badge,
          width: "12px",
          height: "12px",
          border: "2px solid #1a1a1a",
          cursor: "crosshair",
          boxShadow: "0 0 8px rgba(0, 0, 0, 0.6)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          fontSize: "11px",
          fontWeight: "600",
          color: colors.badge,
          letterSpacing: "0.5px",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span>{colors.icon}</span>
        <span>{data.nodeType}</span>
      </div>

      <button
        onClick={handleExpand}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "rgba(255, 255, 255, 0.1)",
          color: colors.badge,
          border: `1px solid ${colors.badge}`,
          borderRadius: "4px",
          width: "22px",
          height: "22px",
          cursor: "pointer",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          zIndex: 5,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.badge;
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.color = colors.badge;
        }}
        title="Configure node"
      >
        ⚙
      </button>

      <div
        style={{
          textAlign: "center",
          color: "#e5e5e5",
          fontWeight: "500",
          fontSize: "14px",
          pointerEvents: "none",
          marginTop: "4px",
        }}
      >
        {data.label}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        style={{
          background: colors.badge,
          width: "12px",
          height: "12px",
          border: "2px solid #1a1a1a",
          cursor: "crosshair",
          boxShadow: "0 0 8px rgba(0, 0, 0, 0.6)",
        }}
      />
    </div>
  );
};

export const getLLMNodeFields = () => ({
  model: {
    name: "Model",
    type: "select",
    options: ["Gemini"],
  },
  systemPrompt: { name: "System Prompt", type: "textarea" },
  userMessage: { name: "User Message", type: "textarea" },
});
