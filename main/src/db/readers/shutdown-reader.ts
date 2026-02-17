import { getDb } from '../database'
import type { CoreWorkload } from '@common/api/generated/types.gen'

export function readShutdownServers(): CoreWorkload[] {
  const db = getDb()
  const rows = db.prepare('SELECT server_data FROM shutdown_servers').all() as {
    server_data: string
  }[]
  return rows.map((row) => JSON.parse(row.server_data) as CoreWorkload)
}
