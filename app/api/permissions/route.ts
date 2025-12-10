// app/api/permissions/route.ts
// ALIGNED WITH RLS POLICIES & permissions.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';
import type { UserLevel } from '@/utils/permissions';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@/utils/permissions';

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch all permissions
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('id, name, description')
      .order('name');

    if (permError) {
      console.error('Error fetching permissions:', permError);
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
    }

    // Fetch user level permissions mapping
    const { data: userLevelPermissions, error: levelError } = await supabase
      .from('user_level_permissions')
      .select('level, permissions (id, name)')
      .order('level');

    if (levelError) {
      console.error('Error fetching user level permissions:', levelError);
      return NextResponse.json({ error: 'Failed to fetch user level permissions' }, { status: 500 });
    }

    // Group permissions by level
    const levelPermissions: Record<string, any[]> = {};
    userLevelPermissions?.forEach((ulp: any) => {
      const level = ulp.level;
      if (!levelPermissions[level]) {
        levelPermissions[level] = [];
      }
      if (ulp.permissions) {
        levelPermissions[level].push(ulp.permissions);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        permissions,
        levelPermissions
      }
    });
  } catch (error) {
    console.error('Permission API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST to initialize default permissions (one-time setup)
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const body = await request.json();

    if (body.action === 'initialize') {
      // Create all permissions from PERMISSIONS constant
      const defaultPermissions = Object.entries(PERMISSIONS).map(([name, description]) => ({
        name,
        description
      }));

      // Insert all permissions
      const { data: insertedPerms, error: permError } = await supabase
        .from('permissions')
        .upsert(defaultPermissions, { onConflict: 'name' })
        .select('id, name');

      if (permError) {
        console.error('Error inserting permissions:', permError);
        return NextResponse.json({ error: 'Failed to insert permissions' }, { status: 500 });
      }

      if (!insertedPerms) {
        return NextResponse.json({ error: 'No permissions inserted' }, { status: 500 });
      }

      // Create a map for quick lookup
      const permissionMap = new Map(insertedPerms.map((p: { id: string; name: string }) => [p.name, p.id]));

      // Delete existing mappings to avoid duplicates
      await supabase.from('user_level_permissions').delete().neq('level', '');

      // Create permission mappings for each level from ROLE_PERMISSIONS
      const mappings: Array<{ level: UserLevel; permission_id: string }> = [];

      for (const [level, permissions] of Object.entries(ROLE_PERMISSIONS) as [UserLevel, string[]][]) {
        for (const permName of permissions) {
          const permId = permissionMap.get(permName);
          if (permId) {
            mappings.push({
              level,
              permission_id: permId as string
            });
          }
        }
      }

      // Batch insert all mappings
      const { error: mappingError } = await supabase
        .from('user_level_permissions')
        .insert(mappings);

      if (mappingError) {
        console.error('Error inserting permission mappings:', mappingError);
        return NextResponse.json({ error: 'Failed to insert permission mappings' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Permissions initialized successfully',
        stats: {
          totalPermissions: insertedPerms.length,
          totalMappings: mappings.length,
          levels: Object.keys(ROLE_PERMISSIONS)
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Permission initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
