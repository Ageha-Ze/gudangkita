// app/api/laporan/penjualan/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// Define interface for detail_penjualan
interface DetailPenjualan {
  id: string;
  jumlah: number;
  harga: number;
  subtotal: number;
  produk_id: string;
  produk?: {
    id: string;
    nama_produk: string;
    kode_produk: string;
    satuan: string;
  };
}

// Define interface for cicilan
interface Cicilan {
  id: string;
  penjualan_id: string;
  tanggal_cicilan: string;
  jumlah_cicilan: number;
}

export async function GET(request: NextRequest) {
  console.log('🚀 [LAPORAN PENJUALAN API] Starting...');
  
  try {
    const supabase = await supabaseServer();
    const searchParams = request.nextUrl.searchParams;

    // Filter parameters
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const cabangId = searchParams.get('cabang_id');
    const customerId = searchParams.get('customer_id');
    const pegawaiId = searchParams.get('pegawai_id');
    const statusPembayaran = searchParams.get('status_pembayaran');
    const statusDiterima = searchParams.get('status_diterima');
    const jenisPembayaran = searchParams.get('jenis_pembayaran');

    console.log('🔍 [FILTER]', {
      startDate,
      endDate,
      cabangId,
      customerId,
      pegawaiId,
      statusPembayaran,
      statusDiterima,
      jenisPembayaran
    });

    // Build query
    let query = supabase
      .from('transaksi_penjualan')
      .select(`
        *,
        customer:customer_id (id, nama, alamat, no_hp),
        cabang:cabang_id (id, nama_cabang, kode_cabang),
        pegawai:pegawai_id (id, nama),
        detail_penjualan (
          id, 
          jumlah, 
          harga, 
          subtotal, 
          produk_id,
          produk:produk_id (id, nama_produk, kode_produk, satuan)
        )
      `)
      .order('tanggal', { ascending: false });

    // Apply filters
    if (startDate) {
      console.log('📅 Applying start_date filter:', startDate);
      query = query.gte('tanggal', startDate);
    }
    if (endDate) {
      console.log('📅 Applying end_date filter:', endDate);
      query = query.lte('tanggal', endDate);
    }
    if (cabangId) {
      console.log('🏢 Applying cabang_id filter:', cabangId);
      query = query.eq('cabang_id', cabangId);
    }
    if (customerId) {
      console.log('👤 Applying customer_id filter:', customerId);
      query = query.eq('customer_id', customerId);
    }
    if (pegawaiId) {
      console.log('👨‍💼 Applying pegawai_id filter:', pegawaiId);
      query = query.eq('pegawai_id', pegawaiId);
    }
    if (statusPembayaran) {
      console.log('💰 Applying status_pembayaran filter:', statusPembayaran);
      query = query.eq('status_pembayaran', statusPembayaran);
    }
    if (statusDiterima) {
      console.log('📦 Applying status_diterima filter:', statusDiterima);
      query = query.eq('status_diterima', statusDiterima);
    }
    if (jenisPembayaran) {
      console.log('💳 Applying jenis_pembayaran filter:', jenisPembayaran);
      query = query.eq('jenis_pembayaran', jenisPembayaran);
    }

    console.log('⏳ Executing query...');
    const { data: penjualanList, error } = await query;

    if (error) {
      console.error('❌ [SUPABASE ERROR]', error);
      throw error;
    }

    console.log('✅ [QUERY SUCCESS] Found', penjualanList?.length || 0, 'records');
    
    if (penjualanList && penjualanList.length > 0) {
      console.log('📦 [SAMPLE DATA]', penjualanList[0]);
    }

    if (!penjualanList || penjualanList.length === 0) {
      console.warn('⚠️ No data found, returning empty result');
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          totalPenjualan: 0,
          totalNilaiPenjualan: 0,
          totalSubtotal: 0,
          totalBiayaOngkir: 0,
          totalBiayaPotong: 0,
          totalDiskon: 0,
          totalUangMuka: 0,
          totalCicilan: 0,
          totalTerbayar: 0,
          totalSisaTagihan: 0,
          statusPembayaran: { lunas: 0, cicil: 0, belumLunas: 0 },
          nilaiByStatusPembayaran: { lunas: 0, cicil: 0, belumLunas: 0 },
          statusDiterima: { diterima: 0, belumDiterima: 0 },
          jenisPembayaran: { tunai: 0, hutang: 0, transfer: 0 },
          nilaiByJenisPembayaran: { tunai: 0, hutang: 0, transfer: 0 },
          topCustomer: [],
          topCabang: [],
          topPegawai: [],
          rataRataPenjualan: 0,
          rataRataBiayaOngkir: 0,
        },
        filters: {
          startDate,
          endDate,
          cabangId,
          customerId,
          pegawaiId,
          statusPembayaran,
          statusDiterima,
          jenisPembayaran,
        },
      });
    }

    console.log('🔄 Processing data with calculations...');

    // Enrich data with calculations
    const enrichedData = await Promise.all(
      penjualanList.map(async (p, index) => {
        console.log(`  ⚙️ Processing item ${index + 1}/${penjualanList.length}:`, p.id);
        
        // Calculate subtotal from detail - FIX: Add explicit types
        const subtotal = (p.detail_penjualan || []).reduce(
          (sum: number, d: DetailPenjualan) => sum + Number(d.subtotal || 0),
          0
        );

        // Calculate final total
        const finalTotal = subtotal + 
          Number(p.biaya_ongkir || 0) - 
          Number(p.biaya_potong || 0) - 
          Number(p.nilai_diskon || 0);

        // Get cicilan
        const { data: cicilanList, error: cicilanError } = await supabase
          .from('cicilan_penjualan')
          .select('*')
          .eq('penjualan_id', p.id)
          .order('tanggal_cicilan', { ascending: true });

        if (cicilanError) {
          console.error(`❌ Error fetching cicilan for ${p.id}:`, cicilanError);
        }

        // FIX: Add explicit types
        const totalCicilan = (cicilanList || []).reduce(
          (sum: number, c: Cicilan) => sum + Number(c.jumlah_cicilan || 0),
          0
        );

        const totalBayar = Number(p.dibayar || 0);
        const sisaTagihan = Math.max(0, finalTotal - totalBayar);
        const persenTerbayar = finalTotal > 0 ? (totalBayar / finalTotal) * 100 : 0;

        return {
          ...p,
          cicilan: cicilanList || [],
          subtotal,
          finalTotal,
          totalBayar,
          sisaTagihan,
          persenTerbayar: Math.min(100, persenTerbayar),
          jumlahCicilan: cicilanList?.length || 0,
        };
      })
    );

    console.log('✅ Data enrichment complete');
    console.log('📊 Calculating summary...');

    // Calculate summary statistics
    const summary = {
      totalPenjualan: enrichedData.length,
      totalNilaiPenjualan: enrichedData.reduce((sum, p) => sum + p.finalTotal, 0),
      totalSubtotal: enrichedData.reduce((sum, p) => sum + p.subtotal, 0),
      totalBiayaOngkir: enrichedData.reduce((sum, p) => sum + (p.biaya_ongkir || 0), 0),
      totalBiayaPotong: enrichedData.reduce((sum, p) => sum + (p.biaya_potong || 0), 0),
      totalDiskon: enrichedData.reduce((sum, p) => sum + (p.nilai_diskon || 0), 0),
      totalUangMuka: enrichedData.reduce((sum, p) => sum + (p.uang_muka || 0), 0),
      totalCicilan: enrichedData.reduce((sum, p) => sum + (p.totalBayar - (p.uang_muka || 0)), 0),
      totalTerbayar: enrichedData.reduce((sum, p) => sum + p.totalBayar, 0),
      totalSisaTagihan: enrichedData.reduce((sum, p) => sum + p.sisaTagihan, 0),
      
      // Group by status
      statusPembayaran: {
        lunas: enrichedData.filter(p => p.status_pembayaran === 'Lunas').length,
        cicil: enrichedData.filter(p => p.status_pembayaran === 'Cicil').length,
        belumLunas: enrichedData.filter(p => p.status_pembayaran === 'Belum Lunas').length,
      },
      
      nilaiByStatusPembayaran: {
        lunas: enrichedData.filter(p => p.status_pembayaran === 'Lunas').reduce((sum, p) => sum + p.finalTotal, 0),
        cicil: enrichedData.filter(p => p.status_pembayaran === 'Cicil').reduce((sum, p) => sum + p.finalTotal, 0),
        belumLunas: enrichedData.filter(p => p.status_pembayaran === 'Belum Lunas').reduce((sum, p) => sum + p.finalTotal, 0),
      },
      
      statusDiterima: {
        diterima: enrichedData.filter(p => p.status_diterima === 'Diterima').length,
        belumDiterima: enrichedData.filter(p => p.status_diterima === 'Belum Diterima').length,
      },
      
      jenisPembayaran: {
        tunai: enrichedData.filter(p => p.jenis_pembayaran === 'tunai').length,
        hutang: enrichedData.filter(p => p.jenis_pembayaran === 'hutang').length,
        transfer: enrichedData.filter(p => p.jenis_pembayaran === 'transfer').length,
      },
      
      nilaiByJenisPembayaran: {
        tunai: enrichedData.filter(p => p.jenis_pembayaran === 'tunai').reduce((sum, p) => sum + p.finalTotal, 0),
        hutang: enrichedData.filter(p => p.jenis_pembayaran === 'hutang').reduce((sum, p) => sum + p.finalTotal, 0),
        transfer: enrichedData.filter(p => p.jenis_pembayaran === 'transfer').reduce((sum, p) => sum + p.finalTotal, 0),
      },
      
      // Top customers
      topCustomer: Object.entries(
        enrichedData.reduce((acc, p) => {
          const customerNama = p.customer?.nama || 'Unknown';
          if (!acc[customerNama]) {
            acc[customerNama] = { 
              nama: customerNama, 
              total: 0, 
              count: 0,
              id: p.customer?.id 
            };
          }
          acc[customerNama].total += p.finalTotal;
          acc[customerNama].count += 1;
          return acc;
        }, {} as Record<string, { nama: string; total: number; count: number; id?: string }>)
      )
        .map(([_, data]) => data)
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 5),
      
      // Top cabang
      topCabang: Object.entries(
        enrichedData.reduce((acc, p) => {
          const cabangNama = p.cabang?.nama_cabang || 'Unknown';
          const cabangId = p.cabang?.id || 'unknown';
          const key = `${cabangId}-${cabangNama}`; // Use unique key combining id and name
          if (!acc[key]) {
            acc[key] = { 
              nama: cabangNama, 
              total: 0, 
              count: 0,
              id: cabangId
            };
          }
          acc[key].total += p.finalTotal;
          acc[key].count += 1;
          return acc;
        }, {} as Record<string, { nama: string; total: number; count: number; id?: string }>)
      )
        .map(([_, data]) => data)
        .sort((a: any, b: any) => b.total - a.total),
      
      // Top pegawai
      topPegawai: Object.entries(
        enrichedData.reduce((acc, p) => {
          const pegawaiNama = p.pegawai?.nama || 'Unknown';
          if (!acc[pegawaiNama]) {
            acc[pegawaiNama] = { 
              nama: pegawaiNama, 
              total: 0, 
              count: 0,
              id: p.pegawai?.id 
            };
          }
          acc[pegawaiNama].total += p.finalTotal;
          acc[pegawaiNama].count += 1;
          return acc;
        }, {} as Record<string, { nama: string; total: number; count: number; id?: string }>)
      )
        .map(([_, data]) => data)
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 5),
      
      // Average stats
      rataRataPenjualan: enrichedData.length > 0 
        ? enrichedData.reduce((sum, p) => sum + p.finalTotal, 0) / enrichedData.length 
        : 0,
      rataRataBiayaOngkir: enrichedData.length > 0
        ? enrichedData.reduce((sum, p) => sum + (p.biaya_ongkir || 0), 0) / enrichedData.length
        : 0,
    };

    console.log('✅ Summary calculated:', {
      totalPenjualan: summary.totalPenjualan,
      totalNilaiPenjualan: summary.totalNilaiPenjualan,
      statusPembayaran: summary.statusPembayaran
    });

    console.log('🎉 [SUCCESS] Returning response');

    return NextResponse.json({
      success: true,
      data: enrichedData,
      summary,
      filters: {
        startDate,
        endDate,
        cabangId,
        customerId,
        pegawaiId,
        statusPembayaran,
        statusDiterima,
        jenisPembayaran,
      },
    });
  } catch (error: any) {
    console.error('💥 [FATAL ERROR]', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({ 
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

// POST - untuk analisis khusus
export async function POST(request: NextRequest) {
  console.log('🚀 [POST LAPORAN PENJUALAN API] Starting...');
  
  try {
    const supabase = await supabaseServer();
    const body = await request.json();
    const { type, startDate, endDate } = body;

    console.log('📋 Request type:', type);

    if (type === 'monthly_trend') {
      console.log('📊 Generating monthly trend...');
      
      let query = supabase
        .from('transaksi_penjualan')
        .select('tanggal, total, biaya_ongkir, status_pembayaran')
        .order('tanggal', { ascending: true });

      if (startDate) query = query.gte('tanggal', startDate);
      if (endDate) query = query.lte('tanggal', endDate);

      const { data, error } = await query;
      if (error) throw error;

      console.log('✅ Found', data?.length || 0, 'records for trend');

      const byMonth = (data || []).reduce((acc, p) => {
        const month = new Date(p.tanggal).toISOString().substring(0, 7);
        if (!acc[month]) {
          acc[month] = { 
            month, 
            total: 0, 
            count: 0,
            lunas: 0,
            cicil: 0,
            belumLunas: 0
          };
        }
        acc[month].total += Number(p.total || 0);
        acc[month].count += 1;
        
        if (p.status_pembayaran === 'Lunas') acc[month].lunas += 1;
        else if (p.status_pembayaran === 'Cicil') acc[month].cicil += 1;
        else acc[month].belumLunas += 1;
        
        return acc;
      }, {} as Record<string, any>);

      return NextResponse.json({
        success: true,
        data: Object.values(byMonth),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Specify type: monthly_trend',
    });
  } catch (error: any) {
    console.error('💥 [POST ERROR]', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}