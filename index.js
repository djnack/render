import http from 'http';
import net from 'net';
import { WebSocketServer } from 'ws';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/connect') {
    return handleConnectHTTP(req, res, url);
  }
  if (req.method === 'POST' && url.pathname === '/fetch') {
    return handleFetch(req, res);
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Relay Active');
});

function handleWS(ws) {
  let tcp = null;

  ws.on('message', (data) => {
    if (tcp) {
      tcp.write(data);
      return;
    }

    try {
      const msg = JSON.parse(data.toString());
      if (msg.action === 'connect') {
        tcp = net.createConnection(msg.port, msg.host, () => {
          ws.send(JSON.stringify({ type: 'connected' }));
          tcp.on('data', (chunk) => ws.send(chunk));
        });
        tcp.on('error', (err) => {
          try { ws.send(JSON.stringify({ type: 'error', message: err.message })); } catch {}
        });
        tcp.on('close', () => { try { ws.close(); } catch {} });
      }
    } catch {}
  });

  ws.on('close', () => { if (tcp) tcp.destroy(); });
  ws.on('error', () => { if (tcp) tcp.destroy(); });
}

new WebSocketServer({ server, path: '/video' }).on('connection', handleWS);

function handleConnectHTTP(req, res, url) {
  const host = url.searchParams.get('host');
  const port = parseInt(url.searchParams.get('port'), 10);

  if (!host || !port) {
    res.writeHead(400);
    return res.end('Missing host or port');
  }

  let connected = false;
  const tcp = net.createConnection(port, host, () => {
    connected = true;
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    req.pipe(tcp);
    tcp.pipe(res);
  });

  tcp.on('error', (err) => {
    if (!connected) {
      res.writeHead(502);
      res.end(err.message);
    }
  });

  req.on('error', () => tcp.destroy());
  req.on('close', () => tcp.destroy());
  tcp.on('close', () => { if (!res.destroyed) res.destroy(); });
}

function handleFetch(req, res) {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    try {
      const { url: targetUrl, method, headers, body: reqBody } = JSON.parse(body);
      const resp = await fetch(targetUrl, {
        method: method || 'GET',
        headers: headers || {},
        body: reqBody || null,
      });
      const respBody = await resp.text();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: resp.status,
          headers: Object.fromEntries(resp.headers),
          body: respBody,
        })
      );
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Relay server running on port ${port}`);
});
