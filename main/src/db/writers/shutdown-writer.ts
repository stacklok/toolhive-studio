import { getDb, isDbWritable } from '../database'
import log from '../../logger'
import type { CoreWorkload } from '@common/api/generated/types.gen'

export function writeShutdownServers(servers: CoreWorkload[]): void {
  if (!isDbWritable()) return
  try {
    const db = getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM shutdown_servers').run()
      const insert = db.prepare(
        'INSERT INTO shutdown_servers (server_data) VALUES (?)'
      )
      for (const server of servers) {
        insert.run(JSON.stringify(server))
      }
    })()
  } catch (err) {
    log.error('[DB] Failed to write shutdown servers:', err)
  }
}

export function clearShutdownServersFromDb(): void {
  if (!isDbWritable()) return
  try {
    const db = getDb()
    db.prepare('DELETE FROM shutdown_servers').run()
  } catch (err) {
    log.error('[DB] Failed to clear shutdown servers:', err)
  }
}
