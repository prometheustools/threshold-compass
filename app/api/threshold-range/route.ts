import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { calculateThresholdRange } from '@/lib/algorithms/threshold-range'
import type { ThresholdFeel, ThresholdZone } from '@/types'

// Map dose_log threshold_feel values to the ThresholdZone values the algorithm expects
function feelToZone(feel: ThresholdFeel | null): ThresholdZone | null {
  switch (feel) {
    case 'nothing': return 'sub'
    case 'under': return 'low'
    case 'sweetspot': return 'sweet_spot'
    case 'over': return 'over'
    default: return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { batch_id } = body as { batch_id?: string }

  if (!batch_id) {
    return NextResponse.json({ error: 'batch_id is required' }, { status: 400 })
  }

  // Verify batch belongs to user
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('id, user_id, dose_unit')
    .eq('id', batch_id)
    .eq('user_id', user.id)
    .single()

  if (batchError || !batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  // Fetch completed dose logs for this batch
  const { data: doseLogs, error: doseError } = await supabase
    .from('dose_logs')
    .select('amount, threshold_feel, signal_score, texture_score, interference_score')
    .eq('batch_id', batch_id)
    .eq('user_id', user.id)
    .eq('post_dose_completed', true)
    .order('amount', { ascending: true })

  if (doseError) {
    return NextResponse.json({ error: doseError.message }, { status: 500 })
  }

  if (!doseLogs || doseLogs.length === 0) {
    return NextResponse.json({ error: 'No completed doses found for this batch' }, { status: 400 })
  }

  // Map dose_logs to the format the algorithm expects
  const mappedDoses = doseLogs
    .map((d) => ({
      amount: d.amount as number,
      threshold_zone: feelToZone(d.threshold_feel as ThresholdFeel | null),
    }))
    .filter((d): d is { amount: number; threshold_zone: ThresholdZone } => d.threshold_zone !== null)

  const result = calculateThresholdRange(mappedDoses, batch_id)

  // Upsert into threshold_ranges table
  const { error: upsertError } = await supabase
    .from('threshold_ranges')
    .upsert({
      user_id: user.id,
      batch_id,
      floor_dose: result.floor,
      sweet_spot: result.sweet_spot,
      ceiling_dose: result.ceiling,
      confidence: result.confidence,
      qualifier: result.qualifier,
      doses_used: result.doses_used,
      calculated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,batch_id',
    })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // Update batch calibration status
  await supabase
    .from('batches')
    .update({ calibration_status: 'calibrated' })
    .eq('id', batch_id)
    .eq('user_id', user.id)

  return NextResponse.json({
    floor_dose: result.floor,
    sweet_spot: result.sweet_spot,
    ceiling_dose: result.ceiling,
    confidence: result.confidence,
    qualifier: result.qualifier,
    doses_used: result.doses_used,
  })
}
