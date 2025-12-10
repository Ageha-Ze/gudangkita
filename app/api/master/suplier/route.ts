// app/api/master/suplier/route.ts
import { supabaseAuthenticated } from '@/lib/supabaseServer'; // ✅ Import yang benar
import { NextRequest, NextResponse } from 'next/server';

// GET - List all suplier
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('suplier')
      .select(`
        *,
        cabang:cabang_id (
          id,
          nama_cabang,
          kode_cabang
        )
      `, { count: 'exact' })
      .order('nama', { ascending: true });

    // Search
    if (search) {
      query = query.or(`
        nama.ilike.%${search}%,
        alamat.ilike.%${search}%,
        no_telp.ilike.%${search}%,
        email.ilike.%${search}%,
        daerah_operasi.ilike.%${search}%
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

// POST - Create new suplier
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const body = await request.json();

    const { data, error } = await supabase
      .from('suplier')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      data, 
      message: 'Suplier berhasil ditambahkan' 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}