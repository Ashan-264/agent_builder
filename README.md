# Agent Builder

Agent Builder is a web app for **building AI agents with a visual, node-based workflow editor**.

Instead of hard-coding an agent step-by-step, you can design a flow (nodes + connections) that represents what your agent should do—then run that flow using LLM + memory + automation tools.

## What this project does

Agent Builder is designed to help you create agent workflows that can include:

- **LLM reasoning / text generation** using **Google Gemini** (`@google/generative-ai`)
- **Vector search / memory** using **Pinecone** (`@pinecone-database/pinecone`)
- **Browser / web automation actions** using **Stagehand** (`@browserbasehq/stagehand`)
- A **visual graph editor UI** using **XYFlow / React Flow** (`@xyflow/react`)

In short: it’s a UI-first way to assemble and test agent pipelines (prompt → tool call → memory lookup → next step, etc.).

## Tech stack

- **Next.js** (App Router)
- **React**
- **TypeScript**
- **Tailwind CSS**
- **XYFlow / React Flow** for the workflow editor
- **Gemini + Pinecone + Stagehand** integrations (in progress / being built out)

## Project structure

The actual app lives inside the `agent-builder/` folder:

- `agent-builder/` → Next.js project (run commands from here)
- `agent-builder/src/app/` → Next.js routes (App Router)
- `agent-builder/src/components/` → UI and builder components
- `agent-builder/NODE_ARCHITECTURE.md` → notes on node design / workflow structure
- `agent-builder/IMPLEMENTATION_STATUS.md` → current progress + what’s done/next

## Getting started (local)

### 1) Install dependencies

From the repo root:

```bash
cd agent-builder
npm install
```

### 2) Run the dev server

```bash
npm run dev
```

Then open:

- http://localhost:3000

## Configuration (API keys)

This project will need API keys for the services you use (Gemini, Pinecone, etc.).

Create a `.env.local` file inside `agent-builder/` and add your keys there.

Example (names may change depending on implementation):

```bash
# agent-builder/.env.local
GEMINI_API_KEY=your_key_here
PINECONE_API_KEY=your_key_here
PINECONE_INDEX=your_index_name
```

If you’re not using a service yet, you can leave it out until that part is wired up.

## How to use (high level)

1. **Open the app** in your browser.
2. **Create a workflow** by adding nodes (example: Prompt → LLM → Memory Search → Output).
3. **Connect nodes** to define the execution path.
4. **Run the workflow** and review outputs.
5. **Iterate** by changing prompts, tools, and connections.

## Notes

- This repo is still evolving. Check:
  - `agent-builder/IMPLEMENTATION_STATUS.md` for what’s currently working
  - `agent-builder/NODE_ARCHITECTURE.md` for how nodes are intended to behave

## License

No license specified yet.
