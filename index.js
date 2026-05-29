import http from "http";
import { WebSocketServer, WebSocket } from "ws";

const server = http.createServer();

const wss = new WebSocketServer({
  server,
  path: "/video",
});

wss.on("connection", (client, req) => {
  console.log("🟢 CLIENT CONNECTED");
  console.log("IP:", req.socket.remoteAddress);

  const targetUrl = "wss://panel.zbio.ir/video";

  console.log("➡️ Connecting to backend:", targetUrl);

  const remote = new WebSocket(targetUrl);

  remote.on("open", () => {
    console.log("🟢 BACKEND CONNECTED");
  });

  remote.on("error", (err) => {
    console.log("🔴 BACKEND ERROR:");
    console.error(err);
  });

  remote.on("close", (code, reason) => {
    console.log("🟡 BACKEND CLOSED");
    console.log("code:", code);
    console.log("reason:", reason?.toString?.());
  });

  client.on("message", (data) => {
    console.log("📩 CLIENT → BACKEND:", data.length);

    if (remote.readyState === WebSocket.OPEN) {
      remote.send(data);
    } else {
      console.log("⚠️ remote not open yet");
    }
  });

  remote.on("message", (data) => {
    console.log("📩 BACKEND → CLIENT:", data.length);

    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });

  client.on("close", () => {
    console.log("🔴 CLIENT CLOSED");
    remote.close();
  });

  client.on("error", (err) => {
    console.log("🔴 CLIENT ERROR:");
    console.error(err);
  });

  remote.on("open", () => {
    console.log("🟢 TUNNEL READY (CLIENT ↔ BACKEND)");
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});
