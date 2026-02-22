# matrix-mcp

An MCP (Model Context Protocol) server that wraps the Matrix REST API, giving Gemini (or any MCP client) native access to tasks, messages, and notes.

---

## Installation

```bash
npm install
npm run build
```

The compiled server will be at `dist/index.js`.

---

## Environment Variables

| Variable          | Required | Default                        | Description                  |
| ----------------- | -------- | ------------------------------ | ---------------------------- |
| `MATRIX_API_KEY`  | ✅ Yes   | —                              | `x-api-key` header value     |
| `MATRIX_BASE_URL` | No       | `https://matrix.loot42.com`   | Matrix API base URL          |

---

## Google Antigravity IDE Setup

1. Open the **Agent panel** in Antigravity (⌘+Shift+A or the robot icon in the sidebar)
2. Click **...** (top right of the panel) → **MCP Servers**
3. Click **Add Server** and paste the following config:

```json
{
  "matrix": {
    "command": "node",
    "args": ["/absolute/path/to/matrix-mcp/dist/index.js"],
    "env": {
      "MATRIX_API_KEY": "your-api-key-here",
      "MATRIX_BASE_URL": "https://matrix.loot42.com"
    }
  }
}
```

> **Replace** `/absolute/path/to/matrix-mcp` with the actual path where you cloned/installed this repo.
> **Replace** `your-api-key-here` with the real Matrix API key.

4. Click **Save** — Antigravity will start the server automatically.
5. Gemini can now use Matrix tools directly in the agent panel.

---

## Available Tools

| Tool                  | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `list_tasks`          | List tasks with optional `status` and/or `assignee` filters                 |
| `get_task`            | Get full task details (including notes) by task ID                          |
| `update_task_status`  | Update task status (`pending`, `in_progress`, `ready_to_deploy`, `review`, `done`, `failed`, `rejected`) |
| `post_message`        | Post a chat message to the Matrix message bus                               |
| `get_messages`        | Fetch recent messages, optionally since a timestamp                         |
| `add_task_note`       | Add a note to a task                                                        |

---

## Example Prompts (Antigravity)

- *"List all in_progress tasks"* → calls `list_tasks` with `status: "in_progress"`
- *"What's task 43 about?"* → calls `get_task` with `id: 43`
- *"Mark task 43 ready to deploy with result 'MCP server pushed'"* → calls `update_task_status`
- *"Post to Matrix: deployment complete"* → calls `post_message`
- *"Show me the last 10 Matrix messages"* → calls `get_messages`
- *"Add a note to task 43: needs testing on Windows"* → calls `add_task_note`

---

## Running Manually (for testing)

```bash
MATRIX_API_KEY=your-key node dist/index.js
```

The server speaks MCP over stdio — pipe JSON-RPC messages in, get responses out. It's meant to be launched by an MCP client, not run interactively.

---

## Development

```bash
npm run dev   # Run with tsx (no compile step)
npm run build # Compile TypeScript → dist/
npm start     # Run compiled output
```
