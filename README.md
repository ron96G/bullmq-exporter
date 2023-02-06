[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/r/rgummich/bullmq-exporter)

<div align="center">
    <img width="460" height="300" src="./media/bullmq-monitor.png">
</div>

Service that acts as a central component to monitor BullMQ:

- Exposes a BullMQ dashboard which is per default behind a login page
- Acts as a [Prometheus-Exporter](https://prometheus.io/docs/instrumenting/exporters/) to collect metrics about queues in BullMQ

## Implementation

The following section will provide a brief overview of the libraries and practices used in the implementation of this service.

### BullMQ Dashboard

Implemented by using [@bull-board](https://github.com/felixmosh/bull-board) and secured using [passport](https://www.passportjs.org/).

### Prometheus Exporter

Strongly influenced by [bull_exporter](https://github.com/UpHabit/bull_exporter). Which uses the old bull library.

Implemented by using the [bullmq](https://docs.bullmq.io/) library (specifically the [QueueEvents](https://docs.bullmq.io/guide/events) class) and [prom-client](https://github.com/siimon/prom-client).

For each queue a class extending the QueueEvents class is created. This class listens for the following events: `completed`. Whenever an eventListener is triggered, a [histogram](https://prometheus.io/docs/concepts/metric_types/#histogram) is updated with

1. the duration between the start of the processing and the end of the job
2. the duration between the creation of the job and the end of its processing.

Furthermore, a cron job is executed every n seconds which collects the current status of the queues (`completed`, `active`, `delayed`, `failed`, `waiting` jobs) and writes them to a [gauge](https://prometheus.io/docs/concepts/metric_types/#gauge).

Thus, the following metrics are collected:

| Metric                    | Type      | Description                                             |
| ------------------------- | --------- | ------------------------------------------------------- |
| bullmq_processed_duration | histogram | Processing time for completed jobs                      |
| bullmq_completed_duration | histogram | Completion time for jobs                                |
| bullmq_completed          | gauge     | Total number of completed jobs                          |
| bullmq_active             | gauge     | Total number of active jobs (currently being processed) |
| bullmq_delayed            | gauge     | Total number of jobs that will run in the future        |
| bullmq_failed             | gauge     | Total number of failed jobs                             |
| bullmq_waiting            | gauge     | Total number of jobs waiting to be processed            |

Each metric also has the attribute `queue` which indicated which queue the metric is associated with.

## How to use

### Variables

These environment variables may be set to overwrite the values in the config file.
Note that not all values are supported.

| Name           | Description                         |
| -------------- | ----------------------------------- |
| REDIS_HOST     | Redis host, e. g. "localhost:6379/" |
| REDIS_USERNAME | Redis username                      |
| REDIS_PASSWORD | Redis password                      |
| REDIS_SSL      | Wether to use ssl                   |

### Local

1. Install the dependencies

```bash
npm install
```

2. Default environment is `local`. This can be set using the `NODE_ENV` variable.

```bash
export NODE_ENV=production
```

3. Make sure that the required config file is present: `./configs/config-${NODE_ENV}.json` (see [local](./configs/config-local.json)).
4. Start the server

```bash
npm run dev
```

5. Access the resources `http://localhost:8080/bullmq/ui/login` or `http://localhost:8080/prometheus/metrics`

### Docker

The Dockerimage is published using the [local](./configs/config-local.json) configuration. In most cases that will not be sufficient and should be overwritten.
This can be done using environment variables (see [here](#variables)) or by mounting a separate file.

```bash
# This needs a config file under ./configs/config-dev.json
docker run \
    -it \
    --mount type=bind,source=$(pwd)/configs,target=/app/configs \
    --env=NODE_ENV=dev \
    --env=REDIS_HOST=some-host:6379/ \
    rgummich/bullmq-exporter
```

### Kubernetes

In Kubernetes this may be done using [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/).
