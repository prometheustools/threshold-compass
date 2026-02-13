
import { createClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { dose_log_id, sleep_quality, energy_level, stress_level, threshold_zone, notes } = await request.json();

  if (!dose_log_id || !sleep_quality || !energy_level || !stress_level || !threshold_zone) {
    return NextResponse.json({ error: 'Missing required check-in fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('check_ins')
    .insert({ user_id: user.id, dose_log_id, sleep_quality, energy_level, stress_level, threshold_zone, notes })
    .select()
    .single();

  if (error) {
    console.error('Error creating check-in:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
