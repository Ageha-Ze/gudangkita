// app/api/master/customer/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - List all customer
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('customer')
      .select('*', { count: 'exact' })
      .order('nama', { ascending: true });

    // Search
    if (search) {
      query = query.or(`
        nama.ilike.%${search}%,
        kode_customer.ilike.%${search}%,
        alamat.ilike.%${search}%
      `);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new customer
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    const { data, error } = await supabase
      .from('customer')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      data,
      message: 'Customer berhasil ditambahkan'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
