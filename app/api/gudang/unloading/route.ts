// app/api/gudang/unloading/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - List unloading
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10')));
    const cabangId = searchParams.get('cabang_id');
    const offset = (page - 1) * limit;

    // Query untuk ambil semua data unloading dengan relasi
    let query = supabase
      .from('gudang_unloading')
      .select(`
        id,
        tanggal,
        produk_curah_id,
        produk_jerigen_id,
        jumlah,
        cabang_id,
        keterangan,
        created_at,
        produk_curah:produk_curah_id (
          id,
          nama_produk,
          kode_produk,
          satuan
        ),
        produk_jerigen:produk_jerigen_id (
          id,
          nama_produk,
          kode_produk,
          satuan
        ),
        cabang:cabang_id (
          id,
          nama_cabang,
          kode_cabang
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by cabang jika ada
    if (cabangId) {
      const parsedCabangId = parseInt(cabangId);
      if (isNaN(parsedCabangId)) {
        return NextResponse.json(
          { error: 'Cabang ID harus berupa angka' },
          { status: 400 }
        );
      }
      query = query.eq('cabang_id', parsedCabangId);
    }

    const { data: allData, error } = await query;

    if (error) {
      console.error('Error fetching unloading:', error);
      throw error;
    }

    // Apply search filter
    let filteredData = allData || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter((item: any) => 
        item.produk_curah?.nama_produk?.toLowerCase().includes(searchLower) ||
        item.produk_jerigen?.nama_produk?.toLowerCase().includes(searchLower) ||
        item.produk_curah?.kode_produk?.toLowerCase().includes(searchLower) ||
        item.produk_jerigen?.kode_produk?.toLowerCase().includes(searchLower) ||
        item.cabang?.nama_cabang?.toLowerCase().includes(searchLower) ||
        new Date(item.tanggal).toLocaleDateString('id-ID').includes(searchLower)
      );
    }

    // Group by tanggal + cabang untuk summary view
    const grouped = filteredData.reduce((acc: any, item: any) => {
      const createdAtKey = new Date(item.created_at).toISOString().slice(0, 19);
      const key = `${item.tanggal}-${item.cabang_id}-${createdAtKey}`;
      
      if (!acc[key]) {
        acc[key] = {
          id: item.id,
          tanggal: item.tanggal,
          cabang_id: item.cabang_id,
          cabang: item.cabang,
          items: [],
          total_qty: 0,
          created_at: item.created_at
        };
      }
      
      acc[key].items.push(item);
      acc[key].total_qty += parseFloat(item.jumlah.toString());
      
      return acc;
    }, {});

    const groupedArray = Object.values(grouped);

    // Pagination
    const totalRecords = groupedArray.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedData = groupedArray.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/gudang/unloading:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Terjadi kesalahan saat mengambil data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create unloading
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    let body;

    // Parse body dengan error handling
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Format data tidak valid. Pastikan request body berupa JSON yang valid.' 
        },
        { status: 400 }
      );
    }

    // Validasi field required
    if (!body.tanggal || !body.cabang_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Tanggal dan Cabang wajib diisi' 
        },
        { status: 400 }
      );
    }

    // Validasi tanggal format
    if (isNaN(Date.parse(body.tanggal))) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Format tanggal tidak valid' 
        },
        { status: 400 }
      );
    }

    // Validasi cabang_id adalah angka
    const cabangId = parseInt(body.cabang_id);
    if (isNaN(cabangId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cabang ID harus berupa angka' 
        },
        { status: 400 }
      );
    }

    // Validasi items
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Minimal 1 item unloading harus ditambahkan' 
        },
        { status: 400 }
      );
    }

    // Validasi setiap item
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      
      if (!item.produk_jerigen_id || !item.produk_kiloan_id) {
        return NextResponse.json(
          { 
            success: false,
            error: `Item ke-${i + 1}: Produk jerigen dan kiloan harus diisi` 
          },
          { status: 400 }
        );
      }

      const jumlah = parseFloat(item.jumlah);
      if (isNaN(jumlah) || jumlah <= 0) {
        return NextResponse.json(
          { 
            success: false,
            error: `Item ke-${i + 1}: Jumlah harus berupa angka positif` 
          },
          { status: 400 }
        );
      }
    }

    // Validasi stock produk jerigen (sumber) sebelum unloading
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      
      const { data: produkJerigen, error: produkError } = await supabase
        .from('produk')
        .select('stok, nama_produk')
        .eq('id', item.produk_jerigen_id)
        .single();

      if (produkError) {
        console.error('Error fetching produk jerigen:', produkError);
        return NextResponse.json(
          { 
            success: false,
            error: `Item ke-${i + 1}: Gagal mengecek stock produk jerigen` 
          },
          { status: 500 }
        );
      }

      if (!produkJerigen) {
        return NextResponse.json(
          { 
            success: false,
            error: `Item ke-${i + 1}: Produk jerigen tidak ditemukan` 
          },
          { status: 404 }
        );
      }

      const stockSetelahUnload = parseFloat(produkJerigen.stok) - parseFloat(item.jumlah);
      
      if (stockSetelahUnload < 0) {
        return NextResponse.json(
          { 
            success: false,
            error: `Stock ${produkJerigen.nama_produk} tidak mencukupi!\nStock tersedia: ${produkJerigen.stok} kg\nDiminta: ${item.jumlah} kg` 
          },
          { status: 400 }
        );
      }
    }

    // Validasi produk kiloan exists
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      
      const { data: produkKiloan, error: produkError } = await supabase
        .from('produk')
        .select('id, nama_produk')
        .eq('id', item.produk_kiloan_id)
        .single();

      if (produkError || !produkKiloan) {
        return NextResponse.json(
          { 
            success: false,
            error: `Item ke-${i + 1}: Produk kiloan tidak ditemukan` 
          },
          { status: 404 }
        );
      }
    }

    // Insert semua items dengan timestamp yang sama
    const currentTimestamp = new Date().toISOString();
    const unloadingData = body.items.map((item: any) => ({
      tanggal: body.tanggal,
      produk_curah_id: item.produk_jerigen_id, // Source (jerigen)
      produk_jerigen_id: item.produk_kiloan_id, // Destination (kiloan)
      jumlah: parseFloat(item.jumlah),
      cabang_id: cabangId,
      keterangan: item.keterangan || body.keterangan || null,
      status: 'selesai',
      created_at: currentTimestamp
    }));

    const { data: insertedData, error: insertError } = await supabase
      .from('gudang_unloading')
      .insert(unloadingData)
      .select();

    if (insertError) {
      console.error('Error inserting unloading:', insertError);
      throw insertError;
    }

    // Update stock: KURANGI produk jerigen (sumber), TAMBAH produk kiloan (tujuan)
    try {
      for (const item of body.items) {
        // 1. KURANGI stock produk jerigen (sumber)
        const { data: produkJerigen, error: fetchError1 } = await supabase
          .from('produk')
          .select('stok')
          .eq('id', item.produk_jerigen_id)
          .single();

        if (fetchError1) throw fetchError1;

        if (produkJerigen) {
          const newStokJerigen = parseFloat(produkJerigen.stok) - parseFloat(item.jumlah);
          
          const { error: updateError1 } = await supabase
            .from('produk')
            .update({ stok: newStokJerigen })
            .eq('id', item.produk_jerigen_id);

          if (updateError1) throw updateError1;

          // Insert stock movement KELUAR untuk jerigen
          const { error: stockError1 } = await supabase
            .from('stock_barang')
            .insert({
              produk_id: item.produk_jerigen_id,
              cabang_id: cabangId,
              jumlah: parseFloat(item.jumlah),
              tanggal: body.tanggal,
              tipe: 'keluar',
              keterangan: `Unloading ke kiloan`
            });

          if (stockError1) throw stockError1;
        }

        // 2. TAMBAH stock produk kiloan (tujuan)
        const { data: produkKiloan, error: fetchError2 } = await supabase
          .from('produk')
          .select('stok')
          .eq('id', item.produk_kiloan_id)
          .single();

        if (fetchError2) throw fetchError2;

        if (produkKiloan) {
          const newStokKiloan = parseFloat(produkKiloan.stok) + parseFloat(item.jumlah);
          
          const { error: updateError2 } = await supabase
            .from('produk')
            .update({ stok: newStokKiloan })
            .eq('id', item.produk_kiloan_id);

          if (updateError2) throw updateError2;

          // Insert stock movement MASUK untuk kiloan
          const { error: stockError2 } = await supabase
            .from('stock_barang')
            .insert({
              produk_id: item.produk_kiloan_id,
              cabang_id: cabangId,
              jumlah: parseFloat(item.jumlah),
              tanggal: body.tanggal,
              tipe: 'masuk',
              keterangan: `Hasil unloading dari jerigen`
            });

          if (stockError2) throw stockError2;
        }
      }
    } catch (stockError: any) {
      console.error('Error updating stock:', stockError);
      
      // Rollback: hapus unloading yang baru dibuat
      if (insertedData && insertedData.length > 0) {
        const ids = insertedData.map(item => item.id);
        await supabase
          .from('gudang_unloading')
          .delete()
          .in('id', ids);
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Gagal mengupdate stock. Transaksi dibatalkan.',
          details: stockError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Unloading berhasil! Stock jerigen berkurang, stock kiloan bertambah.',
      data: insertedData,
    });
  } catch (error: any) {
    console.error('Error in POST /api/gudang/unloading:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Terjadi kesalahan saat menyimpan data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Hapus unloading (batalkan transaksi)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID tidak valid atau tidak ditemukan' 
        },
        { status: 400 }
      );
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID harus berupa angka' 
        },
        { status: 400 }
      );
    }

    // Get unloading data dengan created_at
    const { data: mainUnloading, error: mainError } = await supabase
      .from('gudang_unloading')
      .select('tanggal, cabang_id, created_at')
      .eq('id', parsedId)
      .single();

    if (mainError) {
      console.error('Error fetching main unloading:', mainError);
      if (mainError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            success: false,
            error: 'Data tidak ditemukan' 
          },
          { status: 404 }
        );
      }
      throw mainError;
    }

    if (!mainUnloading) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Data tidak ditemukan' 
        },
        { status: 404 }
      );
    }

    // Get semua item dalam batch yang sama (created_at range 1 detik)
    const createdAtDate = new Date(mainUnloading.created_at);
    const startTime = new Date(createdAtDate.getTime() - 1000).toISOString();
    const endTime = new Date(createdAtDate.getTime() + 1000).toISOString();

    const { data: batchItems, error: batchError } = await supabase
      .from('gudang_unloading')
      .select('*')
      .eq('tanggal', mainUnloading.tanggal)
      .eq('cabang_id', mainUnloading.cabang_id)
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    if (batchError) {
      console.error('Error fetching batch items:', batchError);
      throw batchError;
    }

    if (!batchItems || batchItems.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Data tidak ditemukan' 
        },
        { status: 404 }
      );
    }

    // Kembalikan stock untuk semua item dalam batch
    try {
      for (const item of batchItems) {
        // 1. TAMBAH kembali stock produk jerigen (sumber)
        const { data: produkJerigen, error: fetchError1 } = await supabase
          .from('produk')
          .select('stok')
          .eq('id', item.produk_curah_id)
          .single();

        if (fetchError1) {
          console.error('Error fetching produk jerigen for rollback:', fetchError1);
          throw fetchError1;
        }

        if (produkJerigen) {
          const newStokJerigen = parseFloat(produkJerigen.stok) + parseFloat(item.jumlah);
          
          const { error: updateError1 } = await supabase
            .from('produk')
            .update({ stok: newStokJerigen })
            .eq('id', item.produk_curah_id);

          if (updateError1) throw updateError1;
        }

        // 2. KURANGI stock produk kiloan (tujuan)
        const { data: produkKiloan, error: fetchError2 } = await supabase
          .from('produk')
          .select('stok')
          .eq('id', item.produk_jerigen_id)
          .single();

        if (fetchError2) {
          console.error('Error fetching produk kiloan for rollback:', fetchError2);
          throw fetchError2;
        }

        if (produkKiloan) {
          const newStokKiloan = parseFloat(produkKiloan.stok) - parseFloat(item.jumlah);
          
          if (newStokKiloan < 0) {
            return NextResponse.json(
              { 
                success: false,
                error: `Tidak dapat membatalkan unloading. Stock produk kiloan tidak mencukupi untuk dikurangi.` 
              },
              { status: 400 }
            );
          }
          
          const { error: updateError2 } = await supabase
            .from('produk')
            .update({ stok: newStokKiloan })
            .eq('id', item.produk_jerigen_id);

          if (updateError2) throw updateError2;
        }
      }
    } catch (rollbackError: any) {
      console.error('Error during stock rollback:', rollbackError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Gagal mengembalikan stock. Transaksi dibatalkan.',
          details: rollbackError.message
        },
        { status: 500 }
      );
    }

    // Delete semua item dalam batch
    const { error: deleteError } = await supabase
      .from('gudang_unloading')
      .delete()
      .eq('tanggal', mainUnloading.tanggal)
      .eq('cabang_id', mainUnloading.cabang_id)
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    if (deleteError) {
      console.error('Error deleting unloading records:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Unloading berhasil dibatalkan dan stock dikembalikan',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/gudang/unloading:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Terjadi kesalahan saat menghapus data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}