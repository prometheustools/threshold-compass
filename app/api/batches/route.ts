import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Batch, SubstanceType } from '@/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: batches, error } = await supabase
    .from('batches')
    .select('*')
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ batches });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, substance_type, notes, source } = body as {
    name: string;
    substance_type: SubstanceType;
    notes?: string;
    source?: string;
  };

  if (!name || !substance_type) {
    return NextResponse.json(
      { error: 'Name and substance type are required' },
      { status: 400 }
    );
  }

  // Deactivate other batches of same substance type
  await supabase
    .from('batches')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('substance_type', substance_type)
    .eq('is_active', true);

  // Create new batch
  const { data: batch, error } = await supabase
    .from('batches')
    .insert({
      user_id: user.id,
      name,
      substance_type,
      notes: notes || null,
      source: source || null,
      calibration_status: 'uncalibrated',
      potency_estimate: null,
      doses_logged: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ batch }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, is_active, notes, archived_at } = body as {
    id: string;
    is_active?: boolean;
    notes?: string;
    archived_at?: string | null;
  };

  if (!id) {
    return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('batches')
    .select('id, substance_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  // If activating, deactivate others of same substance
  if (is_active === true) {
    await supabase
      .from('batches')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('substance_type', existing.substance_type)
      .eq('is_active', true);
  }

  const updateData: Partial<Batch> = { updated_at: new Date().toISOString() };
  if (is_active !== undefined) updateData.is_active = is_active;
  if (notes !== undefined) updateData.notes = notes;
  if (archived_at !== undefined) updateData.archived_at = archived_at;

  const { data: batch, error } = await supabase
    .from('batches')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ batch });
}
