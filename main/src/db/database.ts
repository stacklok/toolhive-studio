import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import log from '../logger'

let db: Database.Database | null = null
let dbWritable = true

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'desktop.db')
    log.info({ dbPath })
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    log.info(`[DB] Opened database at ${dbPath}`)
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
    log.info('[DB] Database closed')
  }
}

export function isDbWritable(): boolean {
  return dbWritable
}

export function setDbWritable(writable: boolean): void {
  dbWritable = writable
}
