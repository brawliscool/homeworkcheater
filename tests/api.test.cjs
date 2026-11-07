const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../app/api/solve/route.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const reply = { json(payload, init = {}) { return Response.json(payload, init); } };

function load(env, mockFetch) {
  const module = { exports: {} };
  vm.runInNewContext(js, {
    exports: module.exports,
    module,
    process: { env },
    Request, Response, AbortSignal, console,
    require(name) { assert.equal(name, 'next/server'); return { NextResponse: reply }; },
    fetch: mockFetch,
  }, { filename: 'route.js' });
  return module.exports.POST;
}

function request(input) {
  return new Request('https://example.test/api/solve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
}

test('rejects requests before an API key is configured', async () => {
  const post = load({}, () => { throw Error('should not call upstream'); });
  const response = await post(request({ question: '2 + 2?' }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not configured/i);
});

test('allows a text-only question, uses server key and returns answer', async () => {
  let upstreamRequest;
  const post = load({ OPENAI_API_KEY: 'test-key' }, async (url, options) => {
    upstreamRequest = { url, options, payload: JSON.parse(options.body) };
    return Response.json({ choices: [{ message: { content: 'Answer: 4\n1. Add 2 + 2.' } }] });
  });
  const response = await post(request({ question: '2 + 2?' }));
  assert.equal(response.status, 200);
  assert.match((await response.json()).answer, /Answer: 4/);
  assert.equal(upstreamRequest.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(upstreamRequest.options.headers.Authorization, 'Bearer test-key');
  assert.equal(upstreamRequest.payload.model, 'gpt-4o-mini');
});

test('passes a supported image to a vision-capable completion endpoint', async () => {
  const img = 'data:image/png;base64,aGVsbG8=';
  let transmitted;
  const post = load({ SOLVESHOT_API_KEY: 'test-key' }, async (_, options) => {
    transmitted = JSON.parse(options.body);
    return Response.json({ choices: [{ message: { content: 'I can read the question.' } }] });
  });
  const response = await post(request({ images: [img] }));
  assert.equal(response.status, 200);
  assert.equal(transmitted.messages.at(-1).content[1].image_url.url, img);
});

test('rejects malformed and excessive images without upstream calls', async () => {
  const post = load({ OPENAI_API_KEY: 'test-key' }, () => { throw Error('should not call upstream'); });
  for (const input of [{ images: ['javascript:bad'] }, { images: Array(4).fill('data:image/png;base64,aGVsbG8=') }, {}]) {
    const response = await post(request(input));
    assert.equal(response.status, 400);
  }
});

test('hides upstream error response details', async () => {
  const post = load({ OPENAI_API_KEY: 'test-key' }, async () => new Response('hidden provider diagnostics', { status: 401 }));
  const response = await post(request({ question: 'What is an atom?' }));
  assert.equal(response.status, 502);
  assert.doesNotMatch((await response.json()).error, /hidden provider diagnostics/);
});
