
// ===== FILE 3: app/api/transaksi/konsinyasi/retur/route.ts =====
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    // Validasi
    if (!body.detail_konsinyasi_id || !body.jumlah_retur) {
      return NextResponse.json(
        { error: 'Detail konsinyasi dan jumlah retur wajib diisi' },
        { status: 400 }
      );
    }

    // Get detail konsinyasi
    const { data: detail } = await supabase
      .from('detail_konsinyasi')
      .select(`
        *,
        konsinyasi:konsinyasi_id (
          cabang_id
        )
      `)
      .eq('id', body.detail_konsinyasi_id)
      .single();

    if (!detail) {
      return NextResponse.json(
        { error: 'Detail konsinyasi tidak ditemukan' },
        { status: 404 }
      );
    }

    const jumlah = parseFloat(body.jumlah_retur);

    // Validasi jumlah tidak melebihi sisa
    if (jumlah > detail.jumlah_sisa) {
      return NextResponse.json(
        { error: 'Jumlah retur melebihi sisa barang' },
        { status: 400 }
      );
    }

    // Insert retur konsinyasi
    const { data: retur, error: returError } = await supabase
      .from('retur_konsinyasi')
      .insert({
        detail_konsinyasi_id: body.detail_konsinyasi_id,
        tanggal_retur: body.tanggal_retur,
        jumlah_retur: jumlah,
        kondisi: body.kondisi || 'Baik',
        keterangan: body.keterangan || null,
      })
      .select()
      .single();

    if (returError) throw returError;

    // Update detail konsinyasi
    const newJumlahSisa = detail.jumlah_sisa - jumlah;
    const newJumlahKembali = detail.jumlah_kembali + jumlah;

    const { error: updateError } = await supabase
      .from('detail_konsinyasi')
      .update({
        jumlah_sisa: newJumlahSisa,
        jumlah_kembali: newJumlahKembali,
      })
      .eq('id', body.detail_konsinyasi_id);

    if (updateError) throw updateError;

    // Kembalikan stock ke produk (jika kondisi baik)
    if (body.kondisi === 'Baik') {
      const { data: produk } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', detail.produk_id)
        .single();

      if (produk) {
        const newStok = parseFloat(produk.stok) + jumlah;
        
        await supabase
          .from('produk')
          .update({ stok: newStok })
          .eq('id', detail.produk_id);

        // Insert stock movement
        await supabase
          .from('stock_barang')
          .insert({
            produk_id: detail.produk_id,
            cabang_id: detail.konsinyasi.cabang_id,
            jumlah: jumlah,
            tanggal: body.tanggal_retur,
            tipe: 'masuk',
            keterangan: `Retur konsinyasi - ${body.kondisi}`,
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Retur berhasil dicatat',
      data: retur,
    });
  } catch (error: any) {
    console.error('Error creating retur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}