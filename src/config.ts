import { readFileSync } from 'fs'

export interface Config {
  redis: {
    host: string,
    username: string,
    password: string,
    ssl: boolean
  },
  cookieSecret: string,
  cookieMaxAge: string,
  users?: Array<any>
}

const prefix = process.env.NODE_ENV?.toLowerCase() || 'local';
const jsonRaw = readFileSync(`./configs/config-${prefix}.json`)
const config = JSON.parse(jsonRaw.toString())

export default config as Config;