// app/api/master/kas/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const cabangId = searchParams.get('cabang_id');

    let query = supabase
      .from('kas')
      .select('*')
      .order('nama_kas', { ascending: true });

    // Filter by cabang jika ada parameter cabang_id
    if (cabangId) {
      query = query.eq('cabang_id', cabangId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching kas:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    const { data, error } = await supabase
      .from('kas')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, message: 'Data berhasil ditambahkan' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}