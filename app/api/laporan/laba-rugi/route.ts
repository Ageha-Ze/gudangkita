// app/api/laporan/laba-rugi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    
    const tanggal_dari = searchParams.get('tanggal_dari');
    const tanggal_sampai = searchParams.get('tanggal_sampai');
    const cabang_id = searchParams.get('cabang_id');

    if (!tanggal_dari || !tanggal_sampai) {
      return NextResponse.json(
        { error: 'Tanggal dari dan sampai wajib diisi' },
        { status: 400 }
      );
    }

    // ========================================
    // 1. PENDAPATAN DARI PENJUALAN NORMAL
    // ========================================
    let queryPenjualan = supabase
      .from('transaksi_penjualan')
      .select(`
        id,
        tanggal,
        total,
        biaya_ongkir,
        biaya_potong,
        nilai_diskon,
        customer:customer_id (
          cabang_id
        ),
        detail_penjualan (
          jumlah,
          harga,
          subtotal,
          hpp,
          laba_kotor
        )
      `)
      .gte('tanggal', tanggal_dari)
      .lte('tanggal', tanggal_sampai)
      .neq('status', 'batal');

    const { data: penjualanDataRaw, error: penjualanError } = await queryPenjualan;
    
    if (penjualanError) throw penjualanError;

    // Filter by cabang_id if provided (filter by customer's cabang)
    const penjualanData = cabang_id 
      ? penjualanDataRaw.filter((p: any) => p.customer?.cabang_id === parseInt(cabang_id))
      : penjualanDataRaw;

    // Hitung total dari penjualan normal
    let totalPenjualan = 0;
    let totalHPPPenjualan = 0;
    let totalBiayaOngkir = 0;
    let totalBiayaPotong = 0;
    let totalDiskon = 0;

    penjualanData.forEach((p: any) => {
      totalPenjualan += parseFloat(p.total || 0);
      totalBiayaOngkir += parseFloat(p.biaya_ongkir || 0);
      totalBiayaPotong += parseFloat(p.biaya_potong || 0);
      totalDiskon += parseFloat(p.nilai_diskon || 0);

      p.detail_penjualan.forEach((d: any) => {
        totalHPPPenjualan += parseFloat(d.hpp || 0) * parseFloat(d.jumlah || 0);
      });
    });

    const labaPenjualan = totalPenjualan - totalHPPPenjualan;

    // ========================================
    // 2. PENDAPATAN DARI KONSINYASI
    // ========================================
    let queryKonsinyasi = supabase
      .from('penjualan_konsinyasi')
      .select(`
        id,
        tanggal_jual,
        jumlah_terjual,
        total_nilai_kita,
        keuntungan_toko,
        detail_konsinyasi (
          harga_konsinyasi,
          konsinyasi:konsinyasi_id (
            cabang_id
          ),
          produk:produk_id (
            hpp
          )
        )
      `)
      .gte('tanggal_jual', tanggal_dari)
      .lte('tanggal_jual', tanggal_sampai);

    const { data: konsinyasiDataRaw, error: konsinyasiError } = await queryKonsinyasi;
    
    if (konsinyasiError) throw konsinyasiError;

    // Filter by cabang_id if provided
    const konsinyasiData = cabang_id
      ? konsinyasiDataRaw.filter((k: any) => 
          k.detail_konsinyasi?.konsinyasi?.cabang_id === parseInt(cabang_id)
        )
      : konsinyasiDataRaw;

    // Hitung laba konsinyasi
    let totalPendapatanKonsinyasi = 0;
    let totalHPPKonsinyasi = 0;

    konsinyasiData.forEach((k: any) => {
      const pendapatan = parseFloat(k.total_nilai_kita || 0);
      const hpp = parseFloat(k.detail_konsinyasi?.produk?.hpp || 0);
      const jumlah = parseFloat(k.jumlah_terjual || 0);

      totalPendapatanKonsinyasi += pendapatan;
      totalHPPKonsinyasi += hpp * jumlah;
    });

    const labaKonsinyasi = totalPendapatanKonsinyasi - totalHPPKonsinyasi;

    // ========================================
    // 3. BIAYA OPERASIONAL
    // ========================================
    
    // 3a. Pembayaran hutang umum (cicilan yang sudah dibayar)
    let queryCicilan = supabase
      .from('cicilan_hutang_umum')
      .select(`
        jumlah_cicilan,
        kas:kas_id (
          cabang_id
        )
      `)
      .gte('tanggal_cicilan', tanggal_dari)
      .lte('tanggal_cicilan', tanggal_sampai);

    const { data: cicilanHutangRaw, error: cicilanError } = await queryCicilan;

    if (cicilanError) throw cicilanError;

    const cicilanHutang = cabang_id
      ? cicilanHutangRaw.filter((c: any) => c.kas?.cabang_id === parseInt(cabang_id))
      : cicilanHutangRaw;

    const totalCicilanHutang = cicilanHutang?.reduce((sum: number, item: any) => 
      sum + parseFloat(item.jumlah_cicilan || 0), 0
    ) || 0;

    // 3b. Biaya kirim pembelian (ongkos dari supplier)
    let queryPembelian = supabase
      .from('transaksi_pembelian')
      .select('biaya_kirim, cabang_id')
      .gte('tanggal', tanggal_dari)
      .lte('tanggal', tanggal_sampai)
      .neq('status', 'batal');

    if (cabang_id) {
      queryPembelian = queryPembelian.eq('cabang_id', cabang_id);
    }

    const { data: pembelianData, error: pembelianError } = await queryPembelian;

    if (pembelianError) throw pembelianError;

    const totalBiayaKirimPembelian = pembelianData?.reduce((sum: number, item: any) => 
      sum + parseFloat(item.biaya_kirim || 0), 0
    ) || 0;

    // 3c. Transaksi kas keluar (debit = pengeluaran)
    let queryKas = supabase
      .from('transaksi_kas')
      .select(`
        debit,
        kas:kas_id (
          cabang_id
        )
      `)
      .gte('tanggal_transaksi', tanggal_dari)
      .lte('tanggal_transaksi', tanggal_sampai);

    const { data: transaksiKasRaw, error: kasError } = await queryKas;

    if (kasError) throw kasError;

    const transaksiKas = cabang_id
      ? transaksiKasRaw.filter((t: any) => t.kas?.cabang_id === parseInt(cabang_id))
      : transaksiKasRaw;

    const totalPengeluaranKas = transaksiKas?.reduce((sum: number, item: any) => 
      sum + parseFloat(item.debit || 0), 0
    ) || 0;

    const totalBiayaOperasional = totalPengeluaranKas + totalCicilanHutang + totalBiayaKirimPembelian;

    // ========================================
    // 4. RINGKASAN LABA/RUGI
    // ========================================
    const totalPendapatan = totalPenjualan + totalPendapatanKonsinyasi;
    const totalHPP = totalHPPPenjualan + totalHPPKonsinyasi;
    const labaKotor = totalPendapatan - totalHPP;
    const labaBersih = labaKotor - totalBiayaOperasional - totalBiayaPotong;

    // Get cabang info if filtered
    let cabangInfo = null;
    if (cabang_id) {
      const { data: cabangData } = await supabase
        .from('cabang')
        .select('id, nama_cabang, kode_cabang')
        .eq('id', cabang_id)
        .single();
      
      cabangInfo = cabangData;
    }

    return NextResponse.json({
      periode: {
        dari: tanggal_dari,
        sampai: tanggal_sampai,
      },
      cabang: cabangInfo || { nama_cabang: 'Semua Cabang' },
      pendapatan: {
        penjualan_normal: totalPenjualan,
        penjualan_konsinyasi: totalPendapatanKonsinyasi,
        total: totalPendapatan,
      },
      hpp: {
        hpp_penjualan: totalHPPPenjualan,
        hpp_konsinyasi: totalHPPKonsinyasi,
        total: totalHPP,
      },
      laba_kotor: {
        dari_penjualan: labaPenjualan,
        dari_konsinyasi: labaKonsinyasi,
        total: labaKotor,
      },
      biaya: {
        pengeluaran_kas: totalPengeluaranKas,
        cicilan_hutang: totalCicilanHutang,
        biaya_kirim_pembelian: totalBiayaKirimPembelian,
        biaya_operasional_total: totalBiayaOperasional,
        biaya_ongkir_penjualan: totalBiayaOngkir,
        biaya_potong: totalBiayaPotong,
        diskon: totalDiskon,
        total: totalBiayaOperasional + totalBiayaPotong,
      },
      laba_bersih: labaBersih,
      detail: {
        jumlah_transaksi_penjualan: penjualanData.length,
        jumlah_transaksi_konsinyasi: konsinyasiData.length,
      },
    });
  } catch (error: any) {
    console.error('Error generating laba/rugi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}