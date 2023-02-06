import { readFileSync } from "fs";

export interface Config {
  redis: {
    host: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  cookieSecret: string;
  cookieMaxAge: string;
  users?: Array<any>;
}

function setFromEnv(key: string, def: any) {
  const val = process.env[key.toUpperCase()];
  return val === undefined ? def : val;
}

const prefix = process.env.NODE_ENV?.toLowerCase() || "local";
const jsonRaw = readFileSync(`./configs/config-${prefix}.json`);
const config = JSON.parse(jsonRaw.toString()) as Config;

config.redis.host = setFromEnv("REDIS_HOST", config.redis.host);
config.redis.username = setFromEnv("REDIS_USERNAME", config.redis.username);
config.redis.password = setFromEnv("REDIS_PASSWORD", config.redis.password);
config.redis.ssl = setFromEnv("REDIS_SSL", config.redis.ssl);

export default config;
