import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('batches')
    .select('*')
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, substance_type, form, estimated_potency, source_notes, dose_unit, supplements } = await request.json()

  if (!name || !substance_type || !form || !estimated_potency) {
    return NextResponse.json({ error: 'Missing required batch fields' }, { status: 400 })
  }

  const { error: deactivateError } = await supabase
    .from('batches')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (deactivateError) {
    return NextResponse.json({ error: deactivateError.message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('batches')
    .insert({
      user_id: user.id,
      name,
      substance_type,
      form,
      estimated_potency,
      dose_unit: dose_unit === 'ug' ? 'ug' : 'mg',
      supplements: supplements ?? null,
      source_notes: source_notes ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, is_active } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('batches')
    .select('id, is_active')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  // If activating, deactivate all others first
  if (is_active === true) {
    await supabase
      .from('batches')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)
  }

  const updateFields: { is_active?: boolean } = {}
  if (typeof is_active === 'boolean') {
    updateFields.is_active = is_active
  }

  const { data, error } = await supabase
    .from('batches')
    .update(updateFields)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
