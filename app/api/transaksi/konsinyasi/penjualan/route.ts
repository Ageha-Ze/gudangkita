// app/api/transaksi/konsinyasi/penjualan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - List penjualan konsinyasi
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    const detailKonsinyasiId = searchParams.get('detail_konsinyasi_id');

    let query = supabase
      .from('penjualan_konsinyasi')
      .select(`
        *,
        detail_konsinyasi:detail_konsinyasi_id (
          id,
          konsinyasi:konsinyasi_id (
            id,
            kode_konsinyasi
          ),
          produk:produk_id (
            id,
            nama_produk
          )
        ),
        kas:kas_id (
          id,
          nama_kas
        )
      `)
      .order('tanggal_jual', { ascending: false });

    if (detailKonsinyasiId) {
      query = query.eq('detail_konsinyasi_id', detailKonsinyasiId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching penjualan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    // Validasi
    if (!body.detail_konsinyasi_id || !body.jumlah_terjual) {
      return NextResponse.json(
        { error: 'Detail konsinyasi dan jumlah terjual wajib diisi' },
        { status: 400 }
      );
    }

    // Get detail konsinyasi dengan data konsinyasi & cabang
    const { data: detail, error: detailError } = await supabase
      .from('detail_konsinyasi')
      .select(`
        *,
        konsinyasi:konsinyasi_id (
          id,
          kode_konsinyasi,
          cabang_id,
          cabang:cabang_id (
            id,
            nama_cabang
          )
        ),
        produk:produk_id (
          id,
          nama_produk,
          kode_produk,
          satuan
        )
      `)
      .eq('id', body.detail_konsinyasi_id)
      .single();

    if (detailError || !detail) {
      return NextResponse.json(
        { error: 'Detail konsinyasi tidak ditemukan' },
        { status: 404 }
      );
    }

    const jumlah = parseFloat(body.jumlah_terjual);

    // Validasi jumlah tidak melebihi sisa
    if (jumlah > detail.jumlah_sisa) {
      return NextResponse.json(
        { error: `Jumlah terjual melebihi sisa barang (Sisa: ${detail.jumlah_sisa})` },
        { status: 400 }
      );
    }

    // Calculate
    const total_penjualan = jumlah * body.harga_jual_toko;
    const total_nilai_kita = jumlah * detail.harga_konsinyasi;
    const keuntungan_toko = total_penjualan - total_nilai_kita;

    // Validasi kas_id
    if (!body.kas_id) {
      return NextResponse.json(
        { error: 'Kas wajib dipilih' },
        { status: 400 }
      );
    }

    // Start transaction-like operations
    // 1. Insert penjualan konsinyasi
    const { data: penjualan, error: penjualanError } = await supabase
      .from('penjualan_konsinyasi')
      .insert({
        detail_konsinyasi_id: body.detail_konsinyasi_id,
        tanggal_jual: body.tanggal_jual,
        jumlah_terjual: jumlah,
        harga_jual_toko: body.harga_jual_toko,
        total_penjualan,
        total_nilai_kita,
        keuntungan_toko,
        status_pembayaran: 'Sudah Dibayar', // Langsung lunas karena bayar saat ambil barang
        kas_id: body.kas_id,
        tanggal_pembayaran: body.tanggal_pembayaran || body.tanggal_jual,
        keterangan: body.keterangan || null,
      })
      .select()
      .single();

    if (penjualanError) throw penjualanError;

    // 2. Update detail konsinyasi
    const newJumlahTerjual = parseFloat(detail.jumlah_terjual.toString()) + jumlah;
    const newJumlahSisa = parseFloat(detail.jumlah_sisa.toString()) - jumlah;
    const newKeuntunganToko = parseFloat(detail.keuntungan_toko.toString()) + keuntungan_toko;

    const { error: updateError } = await supabase
      .from('detail_konsinyasi')
      .update({
        jumlah_terjual: newJumlahTerjual,
        jumlah_sisa: newJumlahSisa,
        keuntungan_toko: newKeuntunganToko,
      })
      .eq('id', body.detail_konsinyasi_id);

    if (updateError) throw updateError;

    // 3. GUNAKAN KAS DARI INPUT USER (bukan cari otomatis)
    const { data: kasData, error: kasError } = await supabase
      .from('kas')
      .select('id, nama_kas, saldo')
      .eq('id', body.kas_id)
      .single();

    if (kasError || !kasData) {
      return NextResponse.json(
        { 
          error: 'Kas tidak ditemukan' 
        },
        { status: 404 }
      );
    }

    // 4. Update saldo kas
    const saldoLama = parseFloat(kasData.saldo.toString());
    const saldoBaru = saldoLama + total_nilai_kita;
    
    const { error: updateKasError } = await supabase
      .from('kas')
      .update({ 
        saldo: saldoBaru,
        updated_at: new Date().toISOString()
      })
      .eq('id', kasData.id);

    if (updateKasError) {
      console.error('Error updating kas:', updateKasError);
      throw new Error('Gagal update saldo kas: ' + updateKasError.message);
    }

    // 5. ✅ CATAT TRANSAKSI KAS (MENGGUNAKAN TABEL transaksi_kas)
    const keterangan_transaksi = `Penjualan konsinyasi ${detail.konsinyasi.kode_konsinyasi} - ${detail.produk.nama_produk} (${jumlah} ${detail.produk.satuan})`;
    
    const { error: transaksiKasError } = await supabase
      .from('transaksi_kas')
      .insert({
        kas_id: body.kas_id,
        tanggal_transaksi: body.tanggal_pembayaran || body.tanggal_jual,
        kredit: total_nilai_kita,  // Kredit = uang masuk
        debit: 0,                   // Debit = uang keluar (tidak ada)
        keterangan: keterangan_transaksi,
      });

    if (transaksiKasError) {
      console.error('Error inserting transaksi kas:', transaksiKasError);
      // Tidak throw error, tapi log saja karena saldo sudah terupdate
      console.warn('Transaksi kas gagal dicatat, tapi saldo kas sudah terupdate');
    }

    return NextResponse.json({
      success: true,
      message: 'Penjualan berhasil dicatat, kas diperbarui, dan transaksi tercatat',
      data: {
        penjualan,
        kas_info: {
          kas_id: kasData.id,
          nama_kas: kasData.nama_kas,
          jumlah_masuk: total_nilai_kita,
          saldo_sebelum: saldoLama,
          saldo_sesudah: saldoBaru,
        }
      },
    });

  } catch (error: any) {
    console.error('Error creating penjualan:', error);
    return NextResponse.json({ 
      error: error.message || 'Terjadi kesalahan saat memproses penjualan' 
    }, { status: 500 });
  }
}