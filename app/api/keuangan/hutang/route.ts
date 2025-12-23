'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search')?.trim() || '';
    const offset = (page - 1) * limit;

    // Build query - Fetch from transaksi_pembelian where jenis_pembayaran = 'hutang'
    let query = supabase
      .from('transaksi_pembelian')
      .select(`
        id,
        tanggal,
        total,
        uang_muka,
        biaya_kirim,
        jenis_pembayaran,
        jatuh_tempo,
        status_pembayaran,
        suplier:suplier_id (
          id,
          nama
        ),
        cabang:cabang_id (
          id,
          nama_cabang,
          kode_cabang
        ),
        detail_pembelian (
          id,
          subtotal
        )
      `)
      .eq('jenis_pembayaran', 'hutang')
      .order('tanggal', { ascending: false });

    // Search: nota supplier, supplier name, cabang name
    if (search) {
      query = query.or(
        `nota_supplier.ilike.%${search}%,suplier.nama.ilike.%${search}%,cabang.nama_cabang.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data: pembelianData, error, count } = await query;
    if (error) throw error;

    // 🔥 Calculate real payments from cicilan_pembelian for each hutang
    const pembelianIds = (pembelianData || []).map(p => p.id);
    const { data: allCicilan } = await supabase
      .from('cicilan_pembelian')
      .select('pembelian_id, jumlah_cicilan')
      .in('pembelian_id', pembelianIds);

    // Group cicilan by pembelian_id
    const cicilanMap = new Map();
    (allCicilan || []).forEach(c => {
      const id = c.pembelian_id;
      if (!cicilanMap.has(id)) {
        cicilanMap.set(id, 0);
      }
      cicilanMap.set(id, cicilanMap.get(id) + parseFloat(c.jumlah_cicilan?.toString() || '0'));
    });

    // ✅ Transform data to hutang format with real calculations
    const transformedData = (pembelianData || []).map((item: any) => {
      // 🔥 Calculate real total (subtotal + biaya_kirim as per calculateTotal function)
      const subtotal = parseFloat(item.total?.toString() || '0');
      const biayaKirim = parseFloat(item.biaya_kirim?.toString() || '0');
      const realTotal = subtotal + biayaKirim;

      // 🔥 Calculate real dibayar from cicilan
      const dibayar = cicilanMap.get(item.id) || 0;

      const sisa = realTotal - dibayar;

      // Determine status based on payment
      let status = 'belum_lunas';
      if (sisa <= 0) {
        status = 'lunas';
      }

      const cabang = Array.isArray(item.cabang) ? item.cabang[0] : item.cabang;
      const suplier = Array.isArray(item.suplier) ? item.suplier[0] : item.suplier;

      return {
        id: item.id,
        total_hutang: realTotal,
        dibayar: dibayar,
        sisa: sisa,
        status: status,
        jatuh_tempo: item.jatuh_tempo,
        suplier: suplier,
        transaksi_pembelian: {
          id: item.id,
          cabang: cabang
        }
      };
    });

    return NextResponse.json({
      data: transformedData ?? [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching hutang pembelian:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
