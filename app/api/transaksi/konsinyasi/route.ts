// app/api/transaksi/konsinyasi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status wajib diisi' },
        { status: 400 }
      );
    }

    console.log('✅ Completing konsinyasi:', id, 'to status:', status);

    try {
      // First check if konsinyasi exists
      console.log('🔍 Checking if konsinyasi exists...');
      const { data: existing, error: checkError } = await supabase
        .from('transaksi_konsinyasi')
        .select('id, kode_konsinyasi, status')
        .eq('id', id)
        .single();

      console.log('Check result:', { existing, checkError });

      if (checkError || !existing) {
        console.error('❌ Konsinyasi not found:', checkError);
        return NextResponse.json(
          { error: `Konsinyasi tidak ditemukan: ${checkError?.message || 'Unknown error'}` },
          { status: 404 }
        );
      }

      console.log('✅ Current konsinyasi:', existing.kode_konsinyasi, 'status:', existing.status);

      // ✅ Update konsinyasi status to provided status
      console.log('🔄 Updating konsinyasi status...');
      const { data: updated, error: updateError } = await supabase
        .from('transaksi_konsinyasi')
        .update({
          status: status
        })
        .eq('id', id)
        .select('id, kode_konsinyasi, status')
        .single();

      console.log('Update result:', { updated, updateError });

      if (updateError) {
        console.error('❌ Error updating konsinyasi:', updateError);
        return NextResponse.json({
          error: `Gagal memperbarui konsinyasi: ${updateError.message}`
        }, { status: 500 });
      }

      console.log('✅ Konsinyasi status updated:', updated.kode_konsinyasi, 'from', existing.status, 'to', updated.status);

      return NextResponse.json({
        success: true,
        message: `Konsinyasi berhasil ${status}`,
        data: { id: updated.id, kode_konsinyasi: updated.kode_konsinyasi, status: updated.status }
      });
    } catch (unexpectedError: any) {
      console.error('💥 Unexpected error during PUT operation:', unexpectedError);
      return NextResponse.json({
        error: `Unexpected error: ${unexpectedError.message}`
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Unexpected error updating konsinyasi:', error);
    return NextResponse.json({
      error: error.message || 'Gagal memperbarui konsinyasi'
    }, { status: 500 });
  }
}

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

    console.log('📦 Creating konsinyasi:', body);

    // ✅ Validasi
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

    // ✅ Validasi: Cek stock availability (info saja, tidak dikurangi)
    for (const item of body.detail) {
      const { data: produk } = await supabase
        .from('produk')
        .select('stok, nama_produk')
        .eq('id', item.produk_id)
        .single();

      if (produk) {
        const stokTersedia = parseFloat(produk.stok?.toString() || '0');
        const jumlahDiminta = parseFloat(item.jumlah_titip?.toString() || '0');

        if (stokTersedia < jumlahDiminta) {
          return NextResponse.json({
            error: `Stock ${produk.nama_produk} tidak mencukupi! Tersedia: ${stokTersedia}, Diminta: ${jumlahDiminta}`
          }, { status: 400 });
        }
      }
    }

    // ✅ Generate kode konsinyasi: KON-YYYYMMDD-0001
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    const { data: lastKonsinyasi } = await supabase
      .from('transaksi_konsinyasi')
      .select('kode_konsinyasi')
      .like('kode_konsinyasi', `KON-${today}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nomorUrut = 1;
    if (lastKonsinyasi?.kode_konsinyasi) {
      const lastNumber = parseInt(lastKonsinyasi.kode_konsinyasi.split('-').pop() || '0');
      nomorUrut = lastNumber + 1;
    }

    const kode_konsinyasi = `KON-${today}-${nomorUrut.toString().padStart(4, '0')}`;

    console.log('📝 Generated code:', kode_konsinyasi);

    // ✅ Calculate total nilai titip
    const total_nilai_titip = body.detail.reduce((sum: number, item: any) => 
      sum + (parseFloat(item.jumlah_titip) * parseFloat(item.harga_konsinyasi)), 0
    );

    // ✅ Insert transaksi konsinyasi
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

    if (konsinyasiError) {
      console.error('Error inserting konsinyasi:', konsinyasiError);
      throw konsinyasiError;
    }

    console.log('✅ Konsinyasi created:', konsinyasi.id);

    // ✅ Insert detail konsinyasi
    const detailData = body.detail.map((item: any) => ({
      konsinyasi_id: konsinyasi.id,
      produk_id: item.produk_id,
      jumlah_titip: parseFloat(item.jumlah_titip),
      jumlah_sisa: parseFloat(item.jumlah_titip), // Awalnya sama dengan jumlah titip
      jumlah_terjual: 0,
      jumlah_kembali: 0,
      harga_konsinyasi: parseFloat(item.harga_konsinyasi),
      harga_jual_toko: parseFloat(item.harga_jual_toko),
      subtotal_nilai_titip: parseFloat(item.jumlah_titip) * parseFloat(item.harga_konsinyasi),
      keuntungan_toko: 0,
    }));

    const { error: detailError } = await supabase
      .from('detail_konsinyasi')
      .insert(detailData);

    if (detailError) {
      console.error('Error inserting detail:', detailError);
      // Rollback: hapus transaksi konsinyasi
      await supabase
        .from('transaksi_konsinyasi')
        .delete()
        .eq('id', konsinyasi.id);
      
      throw detailError;
    }

    console.log('✅ Detail konsinyasi created');

    // ❌ TIDAK ADA UPDATE STOCK DI SINI!
    // Stock TIDAK dikurangi saat kirim konsinyasi
    // Stock baru dikurangi saat ada penjualan dari toko
    console.log('ℹ️ Stock NOT reduced (konsinyasi = pinjam barang, masih milik kita)');

    // ✅ Fetch complete data
    const { data: completeData } = await supabase
      .from('transaksi_konsinyasi')
      .select(`
        *,
        toko:toko_id (id, nama_toko, kode_toko),
        cabang:cabang_id (id, nama_cabang, kode_cabang),
        pegawai:pegawai_id (id, nama),
        detail_konsinyasi (
          *,
          produk:produk_id (id, nama_produk, kode_produk, satuan)
        )
      `)
      .eq('id', konsinyasi.id)
      .single();

    console.log('✅ Konsinyasi created successfully');

    return NextResponse.json({
      success: true,
      message: 'Konsinyasi berhasil dibuat. Stock akan dikurangi saat ada penjualan dari toko.',
      data: completeData,
      note: 'Stock produk tidak dikurangi karena barang masih milik kita (hanya dititipkan ke toko)'
    });
  } catch (error: any) {
    console.error('❌ Error creating konsinyasi:', error);
    return NextResponse.json({ 
      error: error.message || 'Gagal membuat konsinyasi'
    }, { status: 500 });
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

    console.log('🗑️ Deleting konsinyasi:', id);

    // ✅ 1. Get detail konsinyasi lengkap
    const { data: konsinyasi, error: konsinyasiError } = await supabase
      .from('transaksi_konsinyasi')
      .select(`
        *,
        detail_konsinyasi (
          id,
          produk_id,
          jumlah_titip,
          jumlah_terjual,
          jumlah_sisa,
          jumlah_kembali,
          produk:produk_id (
            id,
            nama_produk,
            stok
          )
        )
      `)
      .eq('id', id)
      .single();

    if (konsinyasiError || !konsinyasi) {
      console.error('Error fetching konsinyasi:', konsinyasiError);
      return NextResponse.json(
        { error: 'Konsinyasi tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log('📦 Konsinyasi:', konsinyasi.kode_konsinyasi);
    console.log('📊 Status:', konsinyasi.status);

    // ✅ 2. Validasi STOCK SAFETY berdasarkan status

    if (konsinyasi.status === 'Aktif') {
      // 🔍 Untuk konsinyasi AKTIF: Cek apakah ada penjualan yang sudah mengurangi stock
      const { data: penjualan } = await supabase
        .from('penjualan_konsinyasi')
        .select('id, jumlah_terjual, total_nilai_kita, kas_id')
        .in('detail_konsinyasi_id', konsinyasi.detail_konsinyasi.map((d: any) => d.id));

      if (penjualan && penjualan.length > 0) {
        const totalTerjual = penjualan.reduce((sum, p) =>
          sum + parseFloat(p.jumlah_terjual?.toString() || '0'), 0
        );

        return NextResponse.json({
          error: `Cannot delete Active konsinyasi with sales (${totalTerjual} pcs sold). Complete the konsinyasi first or reverse sales manually.`
        }, { status: 400 });
      }

      console.log('✅ No sales found for Active konsinyasi, safe to delete');

    } else if (konsinyasi.status === 'Selesai') {
      // 🔍 Untuk konsinyasi SELESAI: Delete aman, tapi perlu restore stock yang terpakai sales
      console.log('✅ Selesai konsinyasi: Completed konsinyasi can be deleted (sold stock will be restored)');

    } else {
      // ❓ Status lain (dibatalkan, dll)
      console.log(`ℹ️ Status ${konsinyasi.status} konsinyasi: Proceeding with delete and stock restoration`);
    }

    // ✅ STOCK RESTORATION RUNS FOR ALL STATUSES
    // Jika ada penjualan konsinyasi yang sudah mengurangi stock, restore kembali

    // ✅ 4. Hapus penjualan konsinyasi terkait
    const { error: deletePenjualanError } = await supabase
      .from('penjualan_konsinyasi')
      .delete()
      .in('detail_konsinyasi_id', konsinyasi.detail_konsinyasi.map((d: any) => d.id));

    if (deletePenjualanError) {
      console.error('Error deleting penjualan konsinyasi:', deletePenjualanError);
      throw deletePenjualanError;
    } else {
      console.log('✅ Penjualan konsinyasi deleted');
    }

    // ✅ 5. Hapus retur konsinyasi terkait (jika ada)
    const { error: deleteReturError } = await supabase
      .from('retur_konsinyasi')
      .delete()
      .in('detail_konsinyasi_id', konsinyasi.detail_konsinyasi.map((d: any) => d.id));

    if (deleteReturError) {
      console.error('⚠️ Warning: Error deleting retur:', deleteReturError);
    } else {
      console.log('✅ Retur deleted (if any)');
    }

    // ✅ STOCK & CASH RESTORATION: Restore both stock and cash from konsinyasi sales
    // When deleting a konsinyasi transaction, it means it "never happened"
    // So: restore stock AND reverse cash transactions
    console.log('🔄 Restoring stock reduced by konsinyasi sales...');
    console.log('💰 Reversing cash received from konsinyasi sales...');

    const { data: allSales } = await supabase
      .from('penjualan_konsinyasi')
      .select('produk_id, jumlah_terjual, total_nilai_kita, kas_id, id')
      .in('detail_konsinyasi_id', konsinyasi.detail_konsinyasi.map((d: any) => d.id));

    if (allSales && allSales.length > 0) {
      // 🔄 CASH REVERSAL: Reverse all cash received from konsinyasi sales
      console.log('📊 Reversing cash transactions...');

      for (const sale of allSales) {
        const cashAmount = parseFloat(sale.total_nilai_kita?.toString() || '0');
        const kasId = sale.kas_id;

        if (cashAmount > 0 && kasId) {
          console.log(`  💸 Cash reversal: Sale from kas ${kasId}, amount ${cashAmount}`);

          // Get current kas balance
          const { data: kasData } = await supabase
            .from('kas')
            .select('saldo, nama_kas')
            .eq('id', kasId)
            .single();

          if (kasData) {
            const newSaldo = parseFloat(kasData.saldo.toString()) - cashAmount;
            console.log(`  💵 Kas ${kasData.nama_kas}: ${kasData.saldo} → ${newSaldo}`);

            // Reverse kas transaction
            const { error: kasUpdateError } = await supabase
              .from('kas')
              .update({ saldo: newSaldo })
              .eq('id', kasId);

            if (kasUpdateError) {
              console.error(`⚠️ Failed to reverse kas ${kasId}:`, kasUpdateError);
            } else {
              // Reverse transaction record
              const { error: transaksiKasError } = await supabase
                .from('transaksi_kas')
                .insert({
                  kas_id: kasId,
                  tanggal_transaksi: new Date().toISOString().split('T')[0],
                  debit: cashAmount, // Debit means money leaving kas
                  kredit: 0,
                  keterangan: `Reversal: Delete Konsinyasi Sale #${sale.id}`
                });

              if (transaksiKasError) {
                console.error(`⚠️ Failed to record kas reversal for sale ${sale.id}:`, transaksiKasError);
              }
            }
          }
        }
      }

      // Group by produk_id to get total sold per product
      const soldByProduct = allSales.reduce((acc: any, sale: any) => {
        const prodId = sale.produk_id;
        const soldQty = parseFloat(sale.jumlah_terjual?.toString() || '0');
        acc[prodId] = (acc[prodId] || 0) + soldQty;
        return acc;
      }, {});

      // Restore stock for each product that was sold
      for (const [productId, totalSold] of Object.entries(soldByProduct)) {
        const soldAmount = totalSold as number;
        const productDetail = konsinyasi.detail_konsinyasi.find((d: any) => d.produk_id === productId);
        const currentProductStock = parseFloat(productDetail?.produk?.stok?.toString() || '0');

        if (soldAmount > 0) {
          const newStock = currentProductStock + soldAmount;
          console.log(`  ↗️ Restoring stock: ${currentProductStock} + ${soldAmount} = ${newStock} for ${productDetail?.produk?.nama_produk}`);

          // ✅ Use explicit value to ensure it works
          const { error: stockUpdateError } = await supabase
            .from('produk')
            .update({
              stok: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId);

          if (stockUpdateError) {
            console.error(`⚠️ Failed to restore stock for product ${productId}:`, stockUpdateError);
            throw new Error(`Stock restoration failed: ${stockUpdateError.message}`);
          } else {
            console.log(`✅ Stock restored to ${newStock} for product ${productId}`);
          }
        }
      }
    } else {
      console.log('ℹ️ No sales records found, no stock/cash to restore');
    }

    // ✅ 5. Hapus detail konsinyasi
    const { error: deleteDetailError } = await supabase
      .from('detail_konsinyasi')
      .delete()
      .eq('konsinyasi_id', id);

    if (deleteDetailError) {
      console.error('Error deleting detail:', deleteDetailError);
      throw deleteDetailError;
    }

    console.log('✅ Detail konsinyasi deleted');

    // ✅ 6. Hapus transaksi konsinyasi
    const { error: deleteKonsinyasiError } = await supabase
      .from('transaksi_konsinyasi')
      .delete()
      .eq('id', id);

    if (deleteKonsinyasiError) {
      console.error('Error deleting konsinyasi:', deleteKonsinyasiError);
      throw deleteKonsinyasiError;
    }

    console.log('✅ Konsinyasi deleted');

    return NextResponse.json({
      success: true,
      message: 'Konsinyasi berhasil dihapus',
      note: 'Stock tidak berubah karena tidak pernah dikurangi saat kirim konsinyasi'
    });
  } catch (error: any) {
    console.error('❌ Error deleting konsinyasi:', error);
    return NextResponse.json({ 
      error: error.message || 'Terjadi kesalahan saat menghapus konsinyasi' 
    }, { status: 500 });
  }
}
