import { Router } from "express";

export interface IFMetricsCollector {
  collectSerialized: () => Promise<any>;
  discoverAllQueues: () => Promise<any>;
}

export function ConfigureRoutes(
  app: Router,
  metricsCollector: IFMetricsCollector
) {
  app.get(`/prometheus/metrics`, async (req, res) => {
    const metrics = await metricsCollector.collectSerialized();
    res.header("content-type", "text/plain");
    res.header("Pragma", "no-cache");
    res.header(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.header("Content-Type-Options", "nosniff");
    res.status(200).send(metrics);
  });

  app.get(`/discoverQueues`, async (req, res) => {
    const queues = await metricsCollector.discoverAllQueues();
    res.status(200).json(queues);
  });
}
