
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // Fetch all data with relations, sorted by ID descending
    let query = supabase
      .from('transaksi_produksi')
      .select(`
        *,
        produk:produk_id (nama_produk),
        pegawai:pegawai_id (nama),
        cabang:cabang_id (nama_cabang)
      `)
      .order('id', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    let filteredData = data || [];

    // Apply search filter if search term exists
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter((item: any) => {
        return (
          // Search by ID
          item.id?.toString().includes(searchLower) ||
          // Search by tanggal
          item.tanggal?.includes(searchLower) ||
          // Search by produk nama
          item.produk?.nama_produk?.toLowerCase().includes(searchLower) ||
          // Search by jumlah
          item.jumlah?.toString().includes(searchLower) ||
          // Search by satuan
          item.satuan?.toLowerCase().includes(searchLower) ||
          // Search by pegawai nama
          item.pegawai?.nama?.toLowerCase().includes(searchLower) ||
          // Search by cabang nama
          item.cabang?.nama_cabang?.toLowerCase().includes(searchLower) ||
          // Search by status
          item.status?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Calculate pagination after filtering
    const total = filteredData.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedData = filteredData.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching productions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const body = await request.json();
    const { tanggal, produk_id, jumlah, satuan, pegawai_id, cabang_id } = body;

    if (!tanggal || !produk_id || !jumlah || !satuan || !pegawai_id || !cabang_id) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('transaksi_produksi')
      .insert({
        tanggal,
        produk_id: parseInt(produk_id),
        jumlah: parseFloat(jumlah),
        satuan,
        pegawai_id: parseInt(pegawai_id),
        cabang_id: parseInt(cabang_id),
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error creating production:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
