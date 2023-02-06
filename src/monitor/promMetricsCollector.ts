import * as bullmq from "bullmq";
import Redis from "ioredis";
import * as prom_client from "prom-client";
import logger from "../logger";
import { PrometheusMonitoredQueue } from "./promQueue";

export interface MetricsCollectorOptions {
  bullmqOpts: bullmq.QueueBaseOptions;
  client: Redis;
  queues?: Array<string>;
}

export interface PrometheusMetrics {
  completedGauge: prom_client.Gauge<any>;
  activeGauge: prom_client.Gauge<any>;
  delayedGauge: prom_client.Gauge<any>;
  failedGauge: prom_client.Gauge<any>;
  waitingGauge: prom_client.Gauge<any>;
  completedDuration: prom_client.Histogram<any>;
  processedDuration: prom_client.Histogram<any>;
}

export class PrometheusMetricsCollector {
  registry: prom_client.Registry;
  monitoredQueues: Array<PrometheusMonitoredQueue> = [];

  name: string;
  bullmqOpts: bullmq.QueueBaseOptions;
  defaultRedisClient: Redis;

  metrics: PrometheusMetrics | undefined;

  constructor(name: string, opts: MetricsCollectorOptions) {
    this.registry = new prom_client.Registry();
    this.name = name;
    this.bullmqOpts = opts.bullmqOpts ?? {
      connection: { maxRetriesPerRequest: null },
    };
    this.defaultRedisClient = opts.client;
    this.registerMetrics(this.registry);

    if (opts.queues) {
      this.registerQueues(opts.queues);
    } else {
      this.discoverAllQueues()
        .then((queues) => {
          logger.info(`Discovered ${queues.length} queues`);
        })
        .catch((err) => {
          logger.error(`Failed to discover queues: ${err}`);
          process.exit(125);
        });
    }
  }

  registerMetrics(reg: prom_client.Registry, prefix = "") {
    this.metrics = {
      completedGauge: new prom_client.Gauge({
        name: `${prefix}bullmq_completed`,
        help: "Total number of completed jobs",
        labelNames: ["queue"],
      }),
      activeGauge: new prom_client.Gauge({
        name: `${prefix}bullmq_active`,
        help: "Total number of active jobs (currently being processed)",
        labelNames: ["queue"],
      }),
      failedGauge: new prom_client.Gauge({
        name: `${prefix}bullmq_failed`,
        help: "Total number of failed jobs",
        labelNames: ["queue"],
      }),
      delayedGauge: new prom_client.Gauge({
        name: `${prefix}bullmq_delayed`,
        help: "Total number of jobs that will run in the future",
        labelNames: ["queue"],
      }),
      waitingGauge: new prom_client.Gauge({
        name: `${prefix}bullmq_waiting`,
        help: "Total number of jobs waiting to be processed",
        labelNames: ["queue"],
      }),
      processedDuration: new prom_client.Histogram({
        name: `${prefix}bullmq_processed_duration`,
        help: "Processing time for completed jobs (processing until completed)",
        buckets: [5, 50, 100, 250, 500, 750, 1000, 2500],
        labelNames: ["queue"],
      }),
      completedDuration: new prom_client.Histogram({
        name: `${prefix}bullmq_completed_duration`,
        help: "Completion time for jobs (created until completed)",
        buckets: [5, 50, 100, 250, 500, 750, 1000, 2500, 5000, 10000],
        labelNames: ["queue"],
      }),
    };

    Object.values(this.metrics).forEach((metric) => reg.registerMetric(metric));
  }

  async discoverAllQueues() {
    const keyPattern = new RegExp(
      `^${this.bullmqOpts.prefix}:([^:]+):(id|failed|active|waiting|stalled-check)$`
    );
    const keyStream = await this.defaultRedisClient.scanStream({
      match: `${this.bullmqOpts.prefix}:*:*`,
    });

    const queues = new Set<string>();
    for await (const keyChunk of keyStream) {
      for (const key of keyChunk) {
        const match = keyPattern.exec(key);
        if (match && match[1]) {
          queues.add(match[1]);
        }
      }
    }
    this.registerQueues(Array.from(queues));
    return Array.from(queues);
  }

  registerQueues(queues: Array<string>) {
    this.monitoredQueues = queues.map(
      (queueName) =>
        new PrometheusMonitoredQueue(queueName, this.metrics!, {
          bullmqOpts: {
            ...this.bullmqOpts,
            connection: this.defaultRedisClient,
          },
          name: queueName,
        })
    );
  }

  async collect() {
    return await this.registry.metrics();
  }

  async collectSerialized() {
    return await this.collect();
  }

  async close() {
    logger.debug("Closing metrics collector");
    try {
      const val = await this.defaultRedisClient.quit();
      logger.debug("Successfully quit redis connection", "response", val);
    } catch (e: unknown) {
      logger.warn("Failed to quit redis connection", "error", e);
    }
    return this.monitoredQueues.forEach(async (q) => await q.close());
  }
}
