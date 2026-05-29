import http from "http";
import { WebSocketServer, WebSocket } from "ws";

const server = http.createServer();

const wss = new WebSocketServer({
  server,
  path: "/video",
});

wss.on("connection", (client) => {
  const remote = new WebSocket(
    "wss://panel.zbio.ir/video"
  );

  remote.on("open", () => {
    console.log("connected to backend");
  });

  client.on("message", (data) => {
    if (remote.readyState === WebSocket.OPEN) {
      remote.send(data);
    }
  });

  remote.on("message", (data) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });

  client.on("close", () => remote.close());
  remote.on("close", () => client.close());

  remote.on("error", console.error);
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`running on ${PORT}`);
});
