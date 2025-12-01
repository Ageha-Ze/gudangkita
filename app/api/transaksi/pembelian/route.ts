// app/api/transaksi/pembelian/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { calculatePembelianTotals } from '@/lib/transaksi/calculatePembelianTotals';

// GET - List semua pembelian
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Fetch all data first without pagination for proper search filtering
    let query = supabase
      .from('transaksi_pembelian')
      .select(`
        *,
        suplier (id, nama),
        cabang (id, nama_cabang, kode_cabang),
        detail_pembelian (id, jumlah, harga, subtotal)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    const { data: allData, error } = await query;
    if (error) throw error;

    // Calculate tagihan for all data
    let dataWithTagihan = await Promise.all(
      (allData || []).map(async (p) => {
        // Use centralized helper to derive subtotal/finalTotal
        const { subtotal, finalTotal } = calculatePembelianTotals(p as any);

        // Ambil total cicilan
        const { data: cicilanList } = await supabase
          .from('cicilan_pembelian')
          .select('jumlah_cicilan')
          .eq('pembelian_id', p.id);

        const totalCicilan =
          cicilanList?.reduce(
            (sum, c) => sum + Number(c.jumlah_cicilan || 0),
            0
          ) || 0;

        // Hitung tagihan akhir: finalTotal - (uang_muka + totalCicilan)
        const tagihan = finalTotal - ((p.uang_muka || 0) + totalCicilan);

        return {
          ...p,
          subtotal,
          finalTotal,
          tagihan: Math.max(0, tagihan),
        };
      })
    );

    // Apply search filter if needed
    if (search) {
      const searchLower = search.toLowerCase();
      dataWithTagihan = dataWithTagihan.filter((item: any) => {
        return (
          item.nota_supplier?.toLowerCase().includes(searchLower) ||
          item.status?.toLowerCase().includes(searchLower) ||
          item.status_barang?.toLowerCase().includes(searchLower) ||
          item.status_pembayaran?.toLowerCase().includes(searchLower) ||
          item.suplier?.nama?.toLowerCase().includes(searchLower) ||
          item.cabang?.nama_cabang?.toLowerCase().includes(searchLower) ||
          item.keterangan?.toLowerCase().includes(searchLower) ||
          new Date(item.tanggal).toLocaleDateString('id-ID').includes(searchLower) ||
          item.total?.toString().includes(searchLower) ||
          item.tagihan?.toString().includes(searchLower) ||
          item.subtotal?.toString().includes(searchLower) ||
          item.finalTotal?.toString().includes(searchLower)
        );
      });
    }

    // Calculate pagination based on filtered data
    const totalRecords = dataWithTagihan.length;
    const totalPages = Math.ceil(totalRecords / limit);
    
    // Apply pagination
    const paginatedData = dataWithTagihan.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching pembelian:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create pembelian baru
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    // Validasi required fields
    if (!body.tanggal || !body.suplier_id || !body.cabang_id) {
      return NextResponse.json(
        { error: 'Tanggal, Supplier, dan Cabang wajib diisi' },
        { status: 400 }
      );
    }

    // Generate nota supplier
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

    const { data: lastPembelian } = await supabase
      .from('transaksi_pembelian')
      .select('nota_supplier')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let notaNumber = 1;

    if (lastPembelian?.nota_supplier) {
      const lastNumber = parseInt(lastPembelian.nota_supplier.split('-').pop() || '0');
      notaNumber = lastNumber + 1;
    }

    const nota_supplier = `PB-${today}-${notaNumber.toString().padStart(4, '0')}`;

    // Prepare pembelian data
    const pembelianData = {
      tanggal: body.tanggal,
      suplier_id: body.suplier_id,
      cabang_id: body.cabang_id,
      nota_supplier,
      total: 0,
      biaya_kirim: body.show_biaya_kirim ? (body.biaya_kirim || 0) : 0,
      uang_muka: body.show_uang_muka ? (body.uang_muka || 0) : 0,
      jenis_pembayaran: body.jenis_pembayaran || 'Tunai',
      status: 'pending',
      status_barang: 'Belum Diterima',
      status_pembayaran: body.jenis_pembayaran === 'Tunai' ? 'Lunas' : 'Belum Lunas',
      keterangan: body.keterangan || '',
    };

    // Insert pembelian
    const { data, error } = await supabase
      .from('transaksi_pembelian')
      .insert(pembelianData)
      .select(`
        *,
        suplier(id, nama),
        cabang(id, nama_cabang, kode_cabang)
      `)
      .single();

    if (error) throw error;

    // Compute canonical totals and attach for client convenience
    let pembelianEnriched: any = data;
    try {
      const { subtotal, finalTotal } = calculatePembelianTotals(pembelianEnriched as any);
      
      // Calculate initial tagihan (before any cicilan)
      const tagihan = finalTotal - (pembelianEnriched.uang_muka || 0);
      
      pembelianEnriched = { 
        ...pembelianEnriched, 
        subtotal, 
        finalTotal, 
        tagihan: Math.max(0, tagihan)
      };
    } catch (e) {
      console.error('Error calculating totals:', e);
    }

    // If payment is Tunai and uang_muka equals finalTotal, update status
    if (pembelianData.jenis_pembayaran === 'Tunai') {
      const { subtotal, finalTotal } = calculatePembelianTotals(pembelianEnriched as any);
      
      if (pembelianData.uang_muka >= finalTotal) {
        await supabase
          .from('transaksi_pembelian')
          .update({ status_pembayaran: 'Lunas' })
          .eq('id', data.id);
        
        pembelianEnriched.status_pembayaran = 'Lunas';
      }
    }

    return NextResponse.json({
      success: true,
      data,
      pembelian: pembelianEnriched,
      message: 'Pembelian berhasil dibuat',
    });
  } catch (error: any) {
    console.error('Error creating pembelian:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}