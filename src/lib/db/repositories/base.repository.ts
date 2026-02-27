import type { Table } from 'dexie'
import type { ZodType } from 'zod'
import type { BaseEntity } from '@/schemas/base.schema'
import { db } from '@/lib/db/database'
import { syncRegistry } from '@/lib/sync/sync-registry'
import { supabase } from '@/lib/supabase/client'

export class BaseRepository<T extends BaseEntity> {
  readonly table: Table<T, string>
  readonly schema: ZodType<T>
  readonly tableName: string

  constructor(table: Table<T, string>, schema: ZodType<T>, tableName: string) {
    this.table = table
    this.schema = schema
    this.tableName = tableName
  }

  async create(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>,
  ): Promise<T> {
    // Auto-récupérer userId si non fourni (Fix: Code Review Story 1.6)
    let userId = (data as Partial<T>).userId
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      userId = user.id
    }

    const now = new Date().toISOString()
    const entity = {
      ...data,
      userId,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    } as unknown as T

    const validated = this.schema.parse(entity) as T
    await this.writeAndSync(validated, 'create')
    return validated
  }

  async getById(id: string): Promise<T | undefined> {
    const entity = await this.table.get(id)
    if (entity && entity.isDeleted) return undefined
    return entity
  }

  async getAll(includeDeleted = false): Promise<T[]> {
    if (includeDeleted) return this.table.toArray()
    return this.table.filter((e) => !e.isDeleted).toArray()
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'isDeleted' | 'deletedAt'>>): Promise<T> {
    const existing = await this.table.get(id)
    if (!existing) throw new Error(`Entity ${id} not found`)

    const updated = {
      ...existing,
      ...data,
      id,
      createdAt: existing.createdAt,
      isDeleted: existing.isDeleted,
      deletedAt: existing.deletedAt,
      updatedAt: new Date().toISOString(),
    } as unknown as T

    const validated = this.schema.parse(updated) as T
    await this.writeAndSync(validated, 'update')
    return validated
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.table.get(id)
    if (!existing) throw new Error(`Entity ${id} not found`)

    const updated = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as T
    await this.writeAndSync(updated, 'delete')
  }

  async restore(id: string): Promise<void> {
    const existing = await this.table.get(id)
    if (!existing) throw new Error(`Entity ${id} not found`)

    const updated = {
      ...existing,
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    } as unknown as T
    await this.writeAndSync(updated, 'update')
  }

  async getDeleted(): Promise<T[]> {
    return this.table.filter((e) => e.isDeleted === true).toArray()
  }

  async getDeletedCount(): Promise<number> {
    return this.table.filter((e) => e.isDeleted === true).count()
  }

  async hardDelete(id: string): Promise<void> {
    if (syncRegistry.isRegistered(this.tableName)) {
      await db.transaction('rw', [this.table, db.syncQueue], async () => {
        await this.table.delete(id)
        await db.syncQueue.add({
          entity: this.tableName,
          entityId: id,
          operation: 'delete',
          payload: JSON.stringify({ id }),
          createdAt: new Date().toISOString(),
        })
      })
    } else {
      await this.table.delete(id)
    }
  }

  /**
   * Atomically write entity to table AND enqueue sync mutation.
   * Both operations are wrapped in a single Dexie transaction to prevent
   * data being saved locally without a corresponding sync queue entry.
   */
  private async writeAndSync(entity: T, operation: 'create' | 'update' | 'delete'): Promise<void> {
    if (syncRegistry.isRegistered(this.tableName)) {
      await db.transaction('rw', [this.table, db.syncQueue], async () => {
        await this.table.put(entity)
        await db.syncQueue.add({
          entity: this.tableName,
          entityId: entity.id,
          operation,
          payload: JSON.stringify(entity),
          createdAt: new Date().toISOString(),
        })
      })
    } else {
      await this.table.put(entity)
    }
  }
}
