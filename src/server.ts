import fs from 'fs';
import http from 'http';
import https from 'https';
import { app } from './app';
import logger from './logger';
import { handleShutdown } from './utils';

const log = logger.child({ pkg: "server" })
const httpsPort = process.env.HTTPS_PORT || 8443;
const httpPort = process.env.HTTP_PORT || 8080;

// comment this in if you want to change the loglevel programmatically
// instead of env variable.
// log.changeGlobalLevel('WARN');

if (["local", undefined].includes(process.env.NODE_ENV!)) {
  // local environment serves http
  const httpServer = http.createServer(app);
  handleShutdown(httpServer);
  httpServer.listen(httpPort, () => log.info(`Service listening on http://0.0.0.0:${httpPort}`));

} else if (process.env.NODE_ENV !== 'test') {
  // live environment only serves https
  const credentials = {
    key: fs.readFileSync('/etc/tls/tls.key', 'utf8'),
    cert: fs.readFileSync('/etc/tls/tls.crt', 'utf8'),
  };
  const httpsServer = https.createServer(credentials, app);
  handleShutdown(httpsServer);
  httpsServer.listen(httpsPort, () => log.info(`Service listening on https://0.0.0.0:${httpsPort}`));

} else {
  // ignoring in testing to prevent port occupation
  log.info(`Running in test. Not listening...`);
}
