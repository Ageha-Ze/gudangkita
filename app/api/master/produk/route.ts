// app/api/master/produk/route.ts
import { supabaseAuthenticated } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

// GET - List all produk
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('produk')
      .select('*', { count: 'exact' })
      .order('nama_produk', { ascending: true });

    // Search
    if (search) {
      query = query.or(`
        nama_produk.ilike.%${search}%,
        kode_produk.ilike.%${search}%,
        satuan.ilike.%${search}%
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

// POST - Create new produk
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated(); // ✅ Added await
    const body = await request.json();

    const { data, error } = await supabase
      .from('produk')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      data, 
      message: 'Produk berhasil ditambahkan' 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}