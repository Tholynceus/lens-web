// LENS MCP server — Streamable HTTP transport (JSON-RPC 2.0)
// Exposes LENS on-chain intel as agent-callable tools.
// Internally reuses /api/agent so there is one brain, no duplicated logic.

export const config = { maxDuration: 60 };

const PROTOCOL = '2025-06-18';
const SERVER_INFO = { name: 'lens', version: '1.0.0' };

const TOOLS = [
  {
    name: 'lens_check_token',
    description: 'Get full LENS on-chain intel and a risk verdict for a Base token by contract address or ticker. Returns liquidity, pair age, dev signals, and a CLEAR, CAUTION, or STOP verdict with the red lines that triggered. Use before trusting or buying a token.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'A Base contract address (0x followed by 40 hex chars) or a ticker like $AEON' },
      },
      required: ['token'],
    },
  },
  {
    name: 'lens_check_handle',
    description: 'Get LENS dev intel for a crypto X account by handle. Returns Bankrbot tokens launched, whether the dev has sold, PleaseBro fee relationships, and notable smart followers. Use to vet the person behind a token.',
    inputSchema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'An X handle, with or without the leading @' },
      },
      required: ['handle'],
    },
  },
  {
    name: 'lens_verdict',
    description: 'Get just the LENS verdict for a Base token contract address: CLEAR, CAUTION, or STOP, with the exact red lines that triggered. A fast gate before you ape.',
    inputSchema: {
      type: 'object',
      properties: {
        contract: { type: 'string', description: 'A Base contract address (0x followed by 40 hex chars)' },
      },
      required: ['contract'],
    },
  },
];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id, mcp-protocol-version, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
}

async function callAgent(base, q) {
  if (!q) return 'No input provided.';
  try {
    const r = await fetch(`${base}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q }),
    });
    const j = await r.json().catch(() => ({}));
    if (j && j.ok && j.answer) return j.answer;
    if (j && j.error) return `LENS could not complete that: ${j.error}`;
    return 'LENS returned no data for that input.';
  } catch (e) {
    return `LENS request failed: ${(e && e.message) || e}`;
  }
}

async function runTool(name, args, base) {
  args = args || {};
  if (name === 'lens_check_token') return callAgent(base, String(args.token || '').trim());
  if (name === 'lens_verdict') return callAgent(base, String(args.contract || '').trim());
  if (name === 'lens_check_handle') {
    let h = String(args.handle || '').trim();
    if (h && !h.startsWith('0x') && !h.startsWith('@')) h = '@' + h;
    return callAgent(base, h);
  }
  throw new Error('Unknown tool: ' + name);
}

function handleMessage(m, base) {
  // returns a Promise of a response object, or null for notifications
  const { id, method, params } = m || {};
  const isNotification = id === undefined || id === null;

  if (method === 'initialize') {
    return Promise.resolve({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: (params && params.protocolVersion) || PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'Use LENS to check a Base token or a crypto X account for on-chain risk. Always show the verdict and red lines as given.',
      },
    });
  }
  if (method === 'tools/list') {
    return Promise.resolve({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
  }
  if (method === 'tools/call') {
    const name = params && params.name;
    const args = (params && params.arguments) || {};
    return runTool(name, args, base)
      .then(text => ({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } }))
      .catch(e => ({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Error: ' + ((e && e.message) || e) }], isError: true } }));
  }
  if (method === 'ping') return Promise.resolve({ jsonrpc: '2.0', id, result: {} });
  if (method === 'resources/list') return Promise.resolve({ jsonrpc: '2.0', id, result: { resources: [] } });
  if (method === 'prompts/list') return Promise.resolve({ jsonrpc: '2.0', id, result: { prompts: [] } });
  if (method && method.startsWith('notifications/')) return Promise.resolve(null);
  if (isNotification) return Promise.resolve(null);
  return Promise.resolve({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    // No server-initiated SSE stream offered; clients fall back to POST.
    return res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Use POST for MCP requests' }, id: null });
  }
  if (req.method !== 'POST') return res.status(405).end();

  const base = 'https://' + (req.headers.host || 'lens-liard.vercel.app');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  const batch = Array.isArray(body);
  const messages = batch ? body : [body];

  const results = await Promise.all(messages.map(m => handleMessage(m, base)));
  const responses = results.filter(Boolean);

  if (responses.length === 0) return res.status(202).end(); // all notifications

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(batch ? responses : responses[0]);
}
