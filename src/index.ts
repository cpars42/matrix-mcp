#!/usr/bin/env node
/**
 * matrix-mcp — MCP server wrapping the Matrix REST API.
 *
 * Config via environment variables:
 *   MATRIX_API_KEY  — required: x-api-key header value
 *   MATRIX_BASE_URL — optional: API base URL (default: https://matrix.loot42.com)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.MATRIX_API_KEY ?? "";
const BASE_URL = process.env.MATRIX_BASE_URL ?? "https://matrix.loot42.com";

if (!API_KEY) {
  process.stderr.write("ERROR: MATRIX_API_KEY environment variable is required\n");
  process.exit(1);
}

const HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

async function apiFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...HEADERS, ...(options.headers as Record<string, string> ?? {}) },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Matrix API error ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

const server = new Server(
  { name: "matrix-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// --- Tool definitions ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_tasks",
      description: "List Matrix tasks with optional filters by status or assignee",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Filter by status: pending, in_progress, ready_to_deploy, review, done, failed, rejected",
          },
          assignee: {
            type: "string",
            description: "Filter by assignee name (e.g. 'Hal 2')",
          },
        },
      },
    },
    {
      name: "get_task",
      description: "Get full details of a Matrix task including its notes",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "number", description: "Task ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "update_task_status",
      description:
        "Update a Matrix task's status. Valid statuses: pending, in_progress, ready_to_deploy, review, done, failed, rejected",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "number", description: "Task ID" },
          status: { type: "string", description: "New status value" },
          result: {
            type: "string",
            description: "Optional summary of work done (recommended when marking ready_to_deploy or review)",
          },
        },
        required: ["id", "status"],
      },
    },
    {
      name: "post_message",
      description: "Post a chat message to the Matrix message bus",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Sender display name (e.g. 'Gemini')" },
          text: { type: "string", description: "Message text" },
        },
        required: ["from", "text"],
      },
    },
    {
      name: "get_messages",
      description: "Get recent Matrix chat messages, optionally filtered by a since timestamp",
      inputSchema: {
        type: "object",
        properties: {
          since: {
            type: "number",
            description: "Unix millisecond timestamp — only return messages after this time",
          },
        },
      },
    },
    {
      name: "add_task_note",
      description: "Add a note to an existing Matrix task",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "number", description: "Task ID" },
          from: { type: "string", description: "Author display name" },
          text: { type: "string", description: "Note content" },
        },
        required: ["id", "from", "text"],
      },
    },
  ],
}));

// --- Tool handlers ---

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      case "list_tasks": {
        const params = new URLSearchParams();
        if (a.status) params.set("status", String(a.status));
        if (a.assignee) params.set("assignee", String(a.assignee));
        const qs = params.toString();
        result = await apiFetch(`/api/tasks${qs ? `?${qs}` : ""}`);
        break;
      }

      case "get_task": {
        result = await apiFetch(`/api/task/${a.id}`);
        break;
      }

      case "update_task_status": {
        const body: Record<string, unknown> = { status: a.status };
        if (a.result !== undefined) body.result = a.result;
        result = await apiFetch(`/api/task/${a.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        break;
      }

      case "post_message": {
        result = await apiFetch("/api/message", {
          method: "POST",
          body: JSON.stringify({ from: a.from, text: a.text }),
        });
        break;
      }

      case "get_messages": {
        const qs = a.since ? `?since=${a.since}` : "";
        result = await apiFetch(`/api/messages${qs}`);
        break;
      }

      case "add_task_note": {
        result = await apiFetch(`/api/task/${a.id}/note`, {
          method: "POST",
          body: JSON.stringify({ from: a.from, text: a.text }),
        });
        break;
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("matrix-mcp server running (stdio)\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
