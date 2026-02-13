interface SupabaseErrorLike {
  code?: unknown
  message?: unknown
}

function readErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as SupabaseErrorLike).message
    if (typeof message === 'string') {
      return message
    }
  }
  return ''
}

function readErrorCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = (error as SupabaseErrorLike).code
    if (typeof code === 'string') {
      return code
    }
  }
  return ''
}

export function isSchemaCacheTableMissingError(error: unknown, tableName?: string): boolean {
  const message = readErrorMessage(error).toLowerCase()
  const code = readErrorCode(error)

  const missingTableByCode = code === 'PGRST205'
  const missingTableByMessage =
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('does not exist')

  if (!missingTableByCode && !missingTableByMessage) {
    return false
  }

  if (!tableName) {
    return true
  }

  return message.includes(`public.${tableName}`) || message.includes(`table '${tableName}'`)
}

export function isSchemaCacheColumnMissingError(error: unknown, columnName?: string): boolean {
  const message = readErrorMessage(error).toLowerCase()
  const code = readErrorCode(error)

  const missingColumnByCode = code === 'PGRST204' || code === '42703'
  const missingColumnByMessage =
    message.includes('could not find the') ||
    message.includes('column') && message.includes('does not exist')

  if (!missingColumnByCode && !missingColumnByMessage) {
    return false
  }

  if (!columnName) {
    return true
  }

  return message.includes(columnName.toLowerCase())
}

export function getSchemaSetupMessage(tableName?: string): string {
  if (tableName) {
    return `Database setup is incomplete: missing table public.${tableName}. Run the SQL in supabase/schema.sql in your Supabase SQL Editor, then retry.`
  }

  return 'Database setup is incomplete. Run the SQL in supabase/schema.sql in your Supabase SQL Editor, then retry.'
}
