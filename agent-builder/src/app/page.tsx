import AgentBuilder from "@/components/AgentBuilder";

export default function Home() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 5,
          background: "rgba(255, 255, 255, 0.95)",
          padding: "15px 30px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: "bold",
            color: "#1a73e8",
          }}
        >
          Agent Builder
        </h1>
      </div>
      <AgentBuilder />
    </div>
  );
}
