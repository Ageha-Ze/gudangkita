// app/api/transaksi/konsinyasi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - List transaksi konsinyasi
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Fetch all data first WITH detail_konsinyasi for calculation
    let query = supabase
      .from('transaksi_konsinyasi')
      .select(`
        *,
        toko:toko_id (
          id,
          kode_toko,
          nama_toko
        ),
        cabang:cabang_id (
          id,
          nama_cabang,
          kode_cabang
        ),
        pegawai:pegawai_id (
          id,
          nama
        ),
        detail_konsinyasi (
          id,
          jumlah_titip,
          jumlah_terjual,
          jumlah_sisa,
          jumlah_kembali,
          subtotal_nilai_titip,
          harga_konsinyasi
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
        item.kode_konsinyasi?.toLowerCase().includes(searchLower) ||
        item.toko?.nama_toko?.toLowerCase().includes(searchLower) ||
        item.cabang?.nama_cabang?.toLowerCase().includes(searchLower) ||
        item.status?.toLowerCase().includes(searchLower) ||
        new Date(item.tanggal_titip).toLocaleDateString('id-ID').includes(searchLower)
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
    console.error('Error fetching transaksi konsinyasi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create transaksi konsinyasi
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    // Validasi
    if (!body.tanggal_titip || !body.toko_id || !body.cabang_id) {
      return NextResponse.json(
        { error: 'Tanggal, Toko, dan Cabang wajib diisi' },
        { status: 400 }
      );
    }

    if (!body.detail || body.detail.length === 0) {
      return NextResponse.json(
        { error: 'Detail barang harus diisi minimal 1 item' },
        { status: 400 }
      );
    }

    // Generate kode konsinyasi: KON-YYYYMMDD-0001
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    const { data: lastKonsinyasi } = await supabase
      .from('transaksi_konsinyasi')
      .select('kode_konsinyasi')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nomorUrut = 1;
    if (lastKonsinyasi?.kode_konsinyasi) {
      const lastNumber = parseInt(lastKonsinyasi.kode_konsinyasi.split('-').pop() || '0');
      nomorUrut = lastNumber + 1;
    }

    const kode_konsinyasi = `KON-${today}-${nomorUrut.toString().padStart(4, '0')}`;

    // Calculate total nilai titip
    const total_nilai_titip = body.detail.reduce((sum: number, item: any) => 
      sum + (item.jumlah_titip * item.harga_konsinyasi), 0
    );

    // Insert transaksi konsinyasi
    const { data: konsinyasi, error: konsinyasiError } = await supabase
      .from('transaksi_konsinyasi')
      .insert({
        kode_konsinyasi,
        tanggal_titip: body.tanggal_titip,
        toko_id: body.toko_id,
        cabang_id: body.cabang_id,
        pegawai_id: body.pegawai_id || null,
        total_nilai_titip,
        status: 'Aktif',
        keterangan: body.keterangan || null,
      })
      .select()
      .single();

    if (konsinyasiError) throw konsinyasiError;

    // Insert detail konsinyasi
    const detailData = body.detail.map((item: any) => ({
      konsinyasi_id: konsinyasi.id,
      produk_id: item.produk_id,
      jumlah_titip: item.jumlah_titip,
      jumlah_sisa: item.jumlah_titip, // Awalnya sama dengan jumlah titip
      jumlah_terjual: 0,
      jumlah_kembali: 0,
      harga_konsinyasi: item.harga_konsinyasi,
      harga_jual_toko: item.harga_jual_toko,
      subtotal_nilai_titip: item.jumlah_titip * item.harga_konsinyasi,
      keuntungan_toko: 0,
    }));

    const { error: detailError } = await supabase
      .from('detail_konsinyasi')
      .insert(detailData);

    if (detailError) {
      // Rollback: hapus transaksi konsinyasi
      await supabase
        .from('transaksi_konsinyasi')
        .delete()
        .eq('id', konsinyasi.id);
      
      throw detailError;
    }

    // Update stock produk (kurangi stock karena dititipkan)
    for (const item of body.detail) {
      const { data: produk } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', item.produk_id)
        .single();

      if (produk) {
        const newStok = parseFloat(produk.stok) - parseFloat(item.jumlah_titip);
        
        await supabase
          .from('produk')
          .update({ stok: newStok })
          .eq('id', item.produk_id);

        // Insert stock movement
        await supabase
          .from('stock_barang')
          .insert({
            produk_id: item.produk_id,
            cabang_id: body.cabang_id,
            jumlah: item.jumlah_titip,
            tanggal: body.tanggal_titip,
            tipe: 'keluar',
            keterangan: `Konsinyasi ke toko - ${kode_konsinyasi}`,
          });
      }
    }

    // Fetch complete data
    const { data: completeData } = await supabase
      .from('transaksi_konsinyasi')
      .select(`
        *,
        toko:toko_id (id, nama_toko),
        cabang:cabang_id (id, nama_cabang),
        pegawai:pegawai_id (id, nama),
        detail_konsinyasi (
          *,
          produk:produk_id (id, nama_produk, kode_produk)
        )
      `)
      .eq('id', konsinyasi.id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Konsinyasi berhasil dibuat',
      data: completeData,
    });
  } catch (error: any) {
    console.error('Error creating konsinyasi:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Hapus transaksi konsinyasi
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID konsinyasi tidak valid' },
        { status: 400 }
      );
    }

    // 1. Get detail konsinyasi untuk kembalikan stock
    const { data: konsinyasi, error: konsinyasiError } = await supabase
      .from('transaksi_konsinyasi')
      .select(`
        *,
        detail_konsinyasi (
          *,
          produk:produk_id (
            id,
            stok
          )
        )
      `)
      .eq('id', id)
      .single();

    if (konsinyasiError || !konsinyasi) {
      return NextResponse.json(
        { error: 'Konsinyasi tidak ditemukan' },
        { status: 404 }
      );
    }

    // 2. Cek status - hanya bisa hapus jika Aktif
    if (konsinyasi.status === 'Selesai') {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus konsinyasi yang sudah selesai' },
        { status: 400 }
      );
    }

    // 3. Hapus penjualan konsinyasi terkait
    const { error: deletePenjualanError } = await supabase
      .from('penjualan_konsinyasi')
      .delete()
      .in('detail_konsinyasi_id', konsinyasi.detail_konsinyasi.map((d: any) => d.id));

    if (deletePenjualanError) {
      console.error('Error deleting penjualan:', deletePenjualanError);
    }

    // 4. Hapus retur konsinyasi terkait
    const { error: deleteReturError } = await supabase
      .from('retur_konsinyasi')
      .delete()
      .in('detail_konsinyasi_id', konsinyasi.detail_konsinyasi.map((d: any) => d.id));

    if (deleteReturError) {
      console.error('Error deleting retur:', deleteReturError);
    }

    // 5. Kembalikan stock produk (hanya yang belum terjual/retur)
    for (const detail of konsinyasi.detail_konsinyasi) {
      if (detail.jumlah_sisa > 0) {
        // Kembalikan stock yang masih di toko
        const { data: produk } = await supabase
          .from('produk')
          .select('stok')
          .eq('id', detail.produk_id)
          .single();

        if (produk) {
          const newStok = parseFloat(produk.stok) + parseFloat(detail.jumlah_sisa);
          
          await supabase
            .from('produk')
            .update({ stok: newStok })
            .eq('id', detail.produk_id);

          // Insert stock movement untuk tracking
          await supabase
            .from('stock_barang')
            .insert({
              produk_id: detail.produk_id,
              cabang_id: konsinyasi.cabang_id,
              jumlah: detail.jumlah_sisa,
              tanggal: new Date().toISOString().split('T')[0],
              tipe: 'masuk',
              keterangan: `Pembatalan konsinyasi - ${konsinyasi.kode_konsinyasi}`,
            });
        }
      }
    }

    // 6. Hapus detail konsinyasi
    const { error: deleteDetailError } = await supabase
      .from('detail_konsinyasi')
      .delete()
      .eq('konsinyasi_id', id);

    if (deleteDetailError) throw deleteDetailError;

    // 7. Hapus transaksi konsinyasi
    const { error: deleteKonsinyasiError } = await supabase
      .from('transaksi_konsinyasi')
      .delete()
      .eq('id', id);

    if (deleteKonsinyasiError) throw deleteKonsinyasiError;

    return NextResponse.json({
      success: true,
      message: 'Konsinyasi berhasil dihapus dan stock dikembalikan',
    });
  } catch (error: any) {
    console.error('Error deleting konsinyasi:', error);
    return NextResponse.json({ 
      error: error.message || 'Terjadi kesalahan saat menghapus konsinyasi' 
    }, { status: 500 });
  }
}