import WebSocket, { WebSocketServer } from "ws";

const PORT = process.env.PORT || 10000;

const wss = new WebSocketServer({ port: PORT });

const TARGET = "wss://141.11.45.234/video";

wss.on("connection", (client) => {
  const remote = new WebSocket(TARGET);

  client.on("message", (msg) => {
    if (remote.readyState === WebSocket.OPEN) {
      remote.send(msg);
    }
  });

  remote.on("message", (msg) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });

  client.on("close", () => remote.close());
  remote.on("close", () => client.close());
});

console.log(`Listening on ${PORT}`);
