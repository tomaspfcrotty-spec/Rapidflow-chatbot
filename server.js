const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

loadEnvFile(path.join(ROOT, ".env"));

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const DEFAULT_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/connect") {
      return handleConnect(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(req, res);
    }

    if (req.method === "GET") {
      return serveStatic(url.pathname, res);
    }

    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Unexpected server error." });
  }
});

server.listen(PORT, () => {
  console.log(`RapidFlow server running at http://localhost:${PORT}`);
  if (!OPENAI_API_KEY) {
    console.log("Missing OPENAI_API_KEY in .env");
  }
});

async function handleConnect(req, res) {
  const body = await readJsonBody(req);
  const model = String(body.model || DEFAULT_MODEL || "").trim();

  if (!OPENAI_API_KEY) {
    return sendJson(res, 400, { error: "OPENAI_API_KEY is missing. Add it to .env beside server.js." });
  }

  if (!model) {
    return sendJson(res, 400, { error: "Model is required." });
  }

  await openAiChat({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: "Reply with exactly the single word connected." },
      { role: "user", content: "ping" }
    ]
  });

  sendJson(res, 200, { ok: true, model });
}

async function handleChat(req, res) {
  const body = await readJsonBody(req);
  const model = String(body.model || DEFAULT_MODEL || "").trim();
  const messages = Array.isArray(body.messages) ? body.messages : null;

  if (!OPENAI_API_KEY) {
    return sendJson(res, 400, { error: "OPENAI_API_KEY is missing. Add it to .env beside server.js." });
  }

  if (!model) {
    return sendJson(res, 400, { error: "Model is required." });
  }

  if (!messages || !messages.length) {
    return sendJson(res, 400, { error: "Messages are required." });
  }

  const data = await openAiChat({ model, temperature: 0.4, messages });
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

  if (!content) {
    return sendJson(res, 502, { error: "The OpenAI response did not include any message content." });
  }

  sendJson(res, 200, { content });
}

async function openAiChat(payload) {
  if (typeof fetch !== "function") {
    throw new Error("This server requires Node.js 18 or newer because fetch is not available.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data && data.error && data.error.message ? data.error.message : `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return data;
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON request body.");
  }
}

function serveStatic(requestPath, res) {
  const pathname = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = path.normalize(path.join(ROOT, pathname));

  if (!safePath.startsWith(ROOT)) {
    return sendText(res, 403, "Forbidden");
  }

  if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
    return sendText(res, 404, "Not found");
  }

  const ext = path.extname(safePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": mimeType });
  fs.createReadStream(safePath).pipe(res);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
