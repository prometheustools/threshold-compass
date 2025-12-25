import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { User, GuidanceLevel, NorthStarType, NotificationSettings, SensitivityProfile } from '@/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    guidance_level,
    north_star,
    notifications,
    sensitivity,
  } = body as {
    guidance_level?: GuidanceLevel;
    north_star?: { type: NorthStarType; custom: string | null };
    notifications?: Partial<NotificationSettings>;
    sensitivity?: Partial<SensitivityProfile>;
  };

  // Build update object with only provided fields
  const updateData: Partial<User> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  // Validate and add guidance_level
  if (guidance_level !== undefined) {
    const validLevels: GuidanceLevel[] = ['minimal', 'guided', 'deep'];
    if (!validLevels.includes(guidance_level)) {
      return NextResponse.json(
        { error: 'Invalid guidance_level' },
        { status: 400 }
      );
    }
    updateData.guidance_level = guidance_level;
  }

  // Validate and add north_star
  if (north_star !== undefined) {
    const validTypes: NorthStarType[] = [
      'stability', 'clarity', 'creativity', 'presence', 'recovery', 'exploration'
    ];
    if (!validTypes.includes(north_star.type)) {
      return NextResponse.json(
        { error: 'Invalid north_star type' },
        { status: 400 }
      );
    }
    updateData.north_star = north_star;
  }

  // Merge notifications (partial update)
  if (notifications !== undefined) {
    // First fetch current notifications to merge
    const { data: currentUser } = await supabase
      .from('users')
      .select('notifications')
      .eq('id', authUser.id)
      .single();

    updateData.notifications = {
      ...currentUser?.notifications,
      ...notifications,
    };
  }

  // Merge sensitivity (partial update)
  if (sensitivity !== undefined) {
    // Validate ranges (1-5)
    for (const [key, value] of Object.entries(sensitivity)) {
      if (key !== 'medications' && key !== 'cannabis') {
        if (typeof value === 'number' && (value < 1 || value > 5)) {
          return NextResponse.json(
            { error: `${key} must be between 1 and 5` },
            { status: 400 }
          );
        }
      }
    }

    // Fetch current sensitivity to merge
    const { data: currentUser } = await supabase
      .from('users')
      .select('sensitivity')
      .eq('id', authUser.id)
      .single();

    updateData.sensitivity = {
      ...currentUser?.sensitivity,
      ...sensitivity,
    };
  }

  // Execute update
  const { data: user, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', authUser.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user });
}
