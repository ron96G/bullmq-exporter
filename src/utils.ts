interface Closeable {
  close(cb?: (err?: Error) => void): void;
}

export function handleShutdown(closable: Closeable) {
  const exitCB = (err?: Error) => {
    if (err) console.error(`Exit failed with ${err}`);
  };
  process.on('SIGINT', () => {
    closable.close(exitCB);
  });
  process.on('SIGQUIT', () => {
    closable.close(exitCB);
  });
  process.on('SIGTERM', () => {
    closable.close(exitCB);
  });
}

interface FutureCloseable {
  close(cb?: (err?: Error) => void): Promise<void>;
}

export function handleFutureShutdown(closable: FutureCloseable) {
  const exitCB = (err?: Error) => {
    if (err) console.error(`Exit failed with ${err}`);
  };

  process.on('SIGINT', async () => {
    console.log('received SIGINT');
    try {
      await closable.close(exitCB);
    } catch (e: unknown) {
      console.log(e);
    }
    console.log('closed');
  });
  process.on('SIGQUIT', async () => {
    console.log('received SIGQUIT');
    try {
      await closable.close(exitCB);
    } catch (e: unknown) {
      console.log(e);
    }
    console.log('closed');
  });
  process.on('SIGTERM', async () => {
    console.log('received SIGTERM');
    try {
      await closable.close(exitCB);
    } catch (e: unknown) {
      console.log(e);
    }
    console.log('closed');
  });
}

export function formatConnectionString(url: string, username?: string, password?: string, ssl = true): string {
  const accessData = username && password ? `${username}:${password}@` : username ? `${username}@` : '';
  return `${ssl ? 'rediss' : 'redis'}://${accessData}${url}`;
}
