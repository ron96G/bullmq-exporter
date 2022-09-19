import express from 'express';
import Redis from 'ioredis';
import config from './config';
import { ConfigureRoutes as ConfigureDashboardRoutes, User } from './controllers/dashboard';
import { ConfigureRoutes as ConfigureMetricsRoute } from './controllers/metrics';
import logger from './logger';
import { PrometheusMetricsCollector } from './monitor/promMetricsCollector';
import { formatConnectionString, handleFutureShutdown } from './utils';

const log = logger.child({ pkg: "app" })
export const app = express();
app.disable('x-powered-by');

const pino = require('pino-http')()
app.use(pino)

app.get('/health', async (req, res) => {
  res.status(200).send('OK');
});

const username = config.redis.username
const password = config.redis.password
const host = config.redis.host

if (username === undefined || password === undefined || host === undefined) {
  process.exit(125);
}

const enableSsl = config.redis.ssl
const prefix = process.env.NODE_ENV?.toLowerCase() || 'local';
const cookieSecret = config.cookieSecret
const cookieMaxAge = config.cookieMaxAge
const defaultUsers: Array<User> = [
  { username: 'admin', password: 'secret', role: 'admin' },
  { username: 'user', password: 'secret', role: 'user' },
];

const users = config.users || defaultUsers

const redisConnString = formatConnectionString(host, username, password, enableSsl);

export const metricsCollector = new PrometheusMetricsCollector('monitor', {
  bullmqOpts: {
    prefix: prefix,
  },
  client: new Redis(redisConnString, { maxRetriesPerRequest: null }),
  queues: [],
});

handleFutureShutdown(metricsCollector);

const dashboardRouter = express.Router();
app.use('/bullmq', dashboardRouter);

metricsCollector
  .discoverAllQueues()
  .then((queues) => {
    log.info(`Discovered ${queues.length} queues`);
    ConfigureDashboardRoutes(dashboardRouter, {
      basePath: '/bullmq',
      queues: metricsCollector.monitoredQueues.map((q) => q.queue),
      cookieSecret: cookieSecret,
      cookieMaxAge: cookieMaxAge,
      users: users,
    });
    ConfigureMetricsRoute(app, metricsCollector);
  })
  .catch((err) => {
    console.error(err);
    process.exit(125);
  });
