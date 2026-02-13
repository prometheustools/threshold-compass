import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [
      { data: userData, error: userError },
      { data: batchesData, error: batchesError },
      { data: doseLogsData, error: doseLogsError },
      { data: checkInsData, error: checkInsError },
      { data: thresholdRangesData, error: thresholdRangesError },
      { data: substanceProfilesData, error: substanceProfilesError },
      { data: reflectionsData, error: reflectionsError },
      { data: patternsData, error: patternsError },
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('batches').select('*').eq('user_id', user.id),
      supabase.from('dose_logs').select('*').eq('user_id', user.id).order('dosed_at', { ascending: false }),
      supabase.from('check_ins').select('*').eq('user_id', user.id),
      supabase.from('threshold_ranges').select('*').eq('user_id', user.id),
      supabase.from('substance_profiles').select('*').eq('user_id', user.id),
      supabase.from('reflections').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('patterns').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    if (userError) throw userError
    if (batchesError) throw batchesError
    if (doseLogsError) throw doseLogsError
    if (checkInsError) throw checkInsError
    if (thresholdRangesError) throw thresholdRangesError
    if (substanceProfilesError) throw substanceProfilesError
    if (reflectionsError) throw reflectionsError
    if (patternsError) throw patternsError

    const exportData = {
      schema_version: '2026-02-12',
      user: userData,
      batches: batchesData,
      dose_logs: doseLogsData,
      check_ins: checkInsData,
      threshold_ranges: thresholdRangesData,
      substance_profiles: substanceProfilesData,
      reflections: reflectionsData,
      patterns: patternsData,
      export_date: new Date().toISOString(),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=threshold-compass-export-${new Date().toISOString().slice(0, 10)}.json`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to export data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
