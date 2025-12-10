// app/api/master/pegawai/route.ts


import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const jabatan = searchParams.get('jabatan') || '';
    const cabangId = searchParams.get('cabang_id') || '';

    let query = supabase
      .from('pegawai')
      .select(`
        id,
        nama,
        jabatan,
        no_telp,
        level_jabatan,
        daerah_operasi,
        cabang_id,
        cabang:cabang_id (
          id,
          nama_cabang,
          kode_cabang
        )
      `)
      .order('nama', { ascending: true });

    if (search) {
      query = query.or(`
        nama.ilike.%${search}%,
        jabatan.ilike.%${search}%
      `);
    }

    if (jabatan) {
      query = query.ilike('jabatan', `%${jabatan}%`);
    }

    if (cabangId) {
      query = query.eq('cabang_id', parseInt(cabangId));
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      message: 'Success'
    });
  } catch (error: any) {
    console.error('Error fetching pegawai:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const body = await request.json();

    // Validation
    const { nama, jabatan } = body;
    if (!nama || !jabatan) {
      return NextResponse.json(
        { error: 'Nama dan jabatan harus diisi' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('pegawai')
      .insert([body])
      .select(`
        id,
        nama,
        jabatan,
        no_telp,
        level_jabatan,
        daerah_operasi,
        cabang_id,
        nomor_ktp,
        tanggal_lahir,
        user_id,
        cabang:cabang_id (
          id,
          nama_cabang,
          kode_cabang
        ),
        user:user_id (
          id,
          username
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      data,
      message: 'Pegawai berhasil ditambahkan'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pegawai:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
