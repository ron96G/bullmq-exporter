import fs from "fs";
import http from "http";
import https from "https";
import { app } from "./app";
import logger from "./logger";
import { handleShutdown } from "./utils";

const keyPath = process.env.TLS_KEY_FILE || "/etc/tls/tls.key";
const crtPath = process.env.TLS_CRT_FILE || "/etc/tls/tls.crt";

const tlsCredentials = {
  key: fs.existsSync(keyPath) ? fs.readFileSync(keyPath, "utf8") : "",
  cert: fs.existsSync(crtPath) ? fs.readFileSync(crtPath, "utf8") : "",
};

const tlsEnabled = tlsCredentials.cert && tlsCredentials.key;

let server;
let port: number;

if (tlsEnabled) {
  server = https.createServer(tlsCredentials, app);
  port = +(process.env.HTTPS_PORT || 8443);
} else {
  server = http.createServer(app);
  port = +(process.env.HTTP_PORT || 8080);
}
handleShutdown(server);

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () =>
    logger.info(
      `Service listening on ${tlsEnabled ? "https" : "http"}://0.0.0.0:${port}`
    )
  );
}
