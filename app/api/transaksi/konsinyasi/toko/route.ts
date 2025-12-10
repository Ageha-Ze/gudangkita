// app/api/transaksi/konsinyasi/toko/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';

// GET - List toko konsinyasi
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Fetch all data first
    let query = supabase
      .from('toko_konsinyasi')
      .select(`
        *,
        cabang:cabang_id (
          id,
          nama_cabang,
          kode_cabang
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    const { data: allData, error } = await query;

    if (error) throw error;

    // Apply search filter
    let filteredData = allData || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter((item: any) => 
        item.kode_toko?.toLowerCase().includes(searchLower) ||
        item.nama_toko?.toLowerCase().includes(searchLower) ||
        item.pemilik?.toLowerCase().includes(searchLower) ||
        item.alamat?.toLowerCase().includes(searchLower) ||
        item.no_telp?.toLowerCase().includes(searchLower) ||
        item.status?.toLowerCase().includes(searchLower) ||
        item.cabang?.nama_cabang?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedData = filteredData.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching toko konsinyasi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create toko konsinyasi
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const body = await request.json();

    // Validasi
    if (!body.kode_toko || !body.nama_toko) {
      return NextResponse.json(
        { error: 'Kode Toko dan Nama Toko wajib diisi' },
        { status: 400 }
      );
    }

    // Check duplicate kode_toko
    const { data: existing } = await supabase
      .from('toko_konsinyasi')
      .select('id')
      .eq('kode_toko', body.kode_toko)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Kode Toko sudah digunakan' },
        { status: 400 }
      );
    }

    // Insert
    const { data, error } = await supabase
      .from('toko_konsinyasi')
      .insert({
        kode_toko: body.kode_toko,
        nama_toko: body.nama_toko,
        pemilik: body.pemilik || null,
        alamat: body.alamat || null,
        no_telp: body.no_telp || null,
        email: body.email || null,
        cabang_id: body.cabang_id || null,
        status: body.status || 'Aktif',
        tanggal_kerjasama: body.tanggal_kerjasama || null,
        keterangan: body.keterangan || null,
      })
      .select(`
        *,
        cabang:cabang_id (
          id,
          nama_cabang
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Toko konsinyasi berhasil ditambahkan',
      data,
    });
  } catch (error: any) {
    console.error('Error creating toko konsinyasi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update toko konsinyasi
export async function PUT(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID tidak valid' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('toko_konsinyasi')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        cabang:cabang_id (
          id,
          nama_cabang
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Toko konsinyasi berhasil diupdate',
      data,
    });
  } catch (error: any) {
    console.error('Error updating toko konsinyasi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete toko konsinyasi
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID tidak valid' },
        { status: 400 }
      );
    }

    // Check if toko has active konsinyasi
    const { data: activeKonsinyasi } = await supabase
      .from('transaksi_konsinyasi')
      .select('id')
      .eq('toko_id', id)
      .eq('status', 'Aktif')
      .limit(1);

    if (activeKonsinyasi && activeKonsinyasi.length > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus toko yang memiliki konsinyasi aktif' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('toko_konsinyasi')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Toko konsinyasi berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting toko konsinyasi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
