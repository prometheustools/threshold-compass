import { createClient } from '@/lib/supabase/server'
import { isSchemaCacheTableMissingError } from '@/lib/supabase/errors'
import { NextResponse, type NextRequest } from 'next/server'

type ImportPayload = {
  user?: Record<string, unknown> | null
  batches?: Array<Record<string, unknown>>
  dose_logs?: Array<Record<string, unknown>>
  check_ins?: Array<Record<string, unknown>>
  threshold_ranges?: Array<Record<string, unknown>>
  substance_profiles?: Array<Record<string, unknown>>
  reflections?: Array<Record<string, unknown>>
  patterns?: Array<Record<string, unknown>>
}

function normalizeRows(
  rows: Array<Record<string, unknown>> | undefined,
  userId: string
): Array<Record<string, unknown>> {
  return (rows ?? []).map((row) => ({
    ...row,
    user_id: userId,
  }))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = (await request.json().catch(() => null)) as ImportPayload | null
  if (!payload) {
    return NextResponse.json({ error: 'Invalid import payload' }, { status: 400 })
  }

  const skippedTables: string[] = []

  try {
    if (payload.user) {
      const { error: userError } = await supabase.from('users').upsert(
        {
          ...payload.user,
          id: user.id,
        },
        { onConflict: 'id' }
      )
      if (userError) throw userError
    }

    const tableOrder: Array<{ name: string; rows: Array<Record<string, unknown>> }> = [
      { name: 'batches', rows: normalizeRows(payload.batches, user.id) },
      { name: 'dose_logs', rows: normalizeRows(payload.dose_logs, user.id) },
      { name: 'check_ins', rows: normalizeRows(payload.check_ins, user.id) },
      { name: 'threshold_ranges', rows: normalizeRows(payload.threshold_ranges, user.id) },
      { name: 'substance_profiles', rows: normalizeRows(payload.substance_profiles, user.id) },
      { name: 'reflections', rows: normalizeRows(payload.reflections, user.id) },
      { name: 'patterns', rows: normalizeRows(payload.patterns, user.id) },
    ]

    for (const table of tableOrder) {
      if (table.rows.length === 0) continue
      const { error } = await supabase.from(table.name).upsert(table.rows, { onConflict: 'id' })
      if (error) {
        if (isSchemaCacheTableMissingError(error, table.name)) {
          skippedTables.push(table.name)
          continue
        }
        throw error
      }
    }

    return NextResponse.json({
      ok: true,
      imported: {
        batches: payload.batches?.length ?? 0,
        dose_logs: payload.dose_logs?.length ?? 0,
        check_ins: payload.check_ins?.length ?? 0,
        threshold_ranges: payload.threshold_ranges?.length ?? 0,
        substance_profiles: payload.substance_profiles?.length ?? 0,
        reflections: payload.reflections?.length ?? 0,
        patterns: payload.patterns?.length ?? 0,
      },
      skipped_tables: skippedTables,
    })
  } catch (error) {
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: unknown }).message)
        : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
