// app/api/persediaan/stock-barang/fix-comprehensive/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * POST - Comprehensive stock fix
 * This will:
 * 1. Get all pembelian transactions and create stock_barang entries
 * 2. Get all produksi transactions and create stock_barang entries
 * 3. Recalculate final stock for each product
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();
    const { mode = 'check' } = body; // 'check' or 'fix'

    console.log(`🔧 Starting comprehensive stock ${mode}...`);

    const results = {
      pembelian_missing: [] as any[],
      produksi_missing: [] as any[],
      penjualan_konsinyasi_missing: [] as any[],
      stock_opname_missing: [] as any[],
      detail_produksi_missing: [] as any[],
      stock_fixed: [] as any[],
      errors: [] as any[],
    };

    // ===== STEP 1: Check Pembelian Transactions =====
    // Get pembelian with status "Diterima"
    const { data: pembelian, error: pembelianError } = await supabase
      .from('transaksi_pembelian')
      .select('id, tanggal, cabang_id, status_barang')
      .eq('status_barang', 'Diterima')
      .order('tanggal', { ascending: true });

    if (pembelianError) throw pembelianError;

    console.log(`📦 Found ${pembelian?.length || 0} pembelian transactions`);

    // Get all pembelian details
    const pembelianIds = pembelian?.map(p => p.id) || [];
    
    if (pembelianIds.length > 0) {
      const { data: pembelianDetails, error: detailsError } = await supabase
        .from('detail_pembelian')
        .select('id, pembelian_id, produk_id, jumlah, harga')
        .in('pembelian_id', pembelianIds);

      if (detailsError) throw detailsError;

      // Get all produk info
      const produkIds = [...new Set(pembelianDetails?.map(d => d.produk_id) || [])];
      const { data: produkData, error: produkError } = await supabase
        .from('produk')
        .select('id, nama_produk, kode_produk, satuan')
        .in('id', produkIds);

      if (produkError) throw produkError;

      // Create produk map for quick lookup
      const produkMap = new Map(produkData?.map(p => [p.id, p]) || []);

      // Check each pembelian detail
      for (const pb of pembelian || []) {
        const details = pembelianDetails?.filter(d => d.pembelian_id === pb.id) || [];
        
        for (const detail of details) {
          const produk = produkMap.get(detail.produk_id);
          
          // Check if stock_barang entry exists
          const { data: existing, error: checkError } = await supabase
            .from('stock_barang')
            .select('id')
            .eq('produk_id', detail.produk_id)
            .eq('cabang_id', pb.cabang_id)
            .eq('tanggal', pb.tanggal)
            .eq('tipe', 'masuk')
            .eq('jumlah', detail.jumlah)
            .ilike('keterangan', `%Pembelian%${pb.id}%`)
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') throw checkError;

          if (!existing) {
            const missingData = {
              pembelian_id: pb.id,
              tanggal: pb.tanggal,
              produk_id: detail.produk_id,
              nama_produk: produk?.nama_produk || 'Unknown',
              cabang_id: pb.cabang_id,
              jumlah: detail.jumlah,
              hpp: detail.harga,
              harga_jual: detail.harga * 1.2,
              persentase: 20,
            };

            results.pembelian_missing.push(missingData);

            // If mode is 'fix', insert the missing record
            if (mode === 'fix') {
              const { error: insertError } = await supabase
                .from('stock_barang')
                .insert({
                  produk_id: detail.produk_id,
                  cabang_id: pb.cabang_id,
                  tanggal: pb.tanggal,
                  jumlah: detail.jumlah,
                  tipe: 'masuk',
                  keterangan: `Pembelian - ${pb.id}`,
                  hpp: detail.harga,
                  harga_jual: detail.harga * 1.2,
                  persentase: 20,
                });

              if (insertError) {
                console.error(`❌ Failed to insert pembelian stock:`, insertError);
                results.errors.push({
                  type: 'pembelian',
                  pembelian_id: pb.id,
                  produk: produk?.nama_produk,
                  error: insertError.message,
                });
              } else {
                console.log(`✅ Inserted stock for pembelian ${pb.id} - ${produk?.nama_produk || 'Unknown'}`);
              }
            }
          }
        }
      }
    }

    // ===== STEP 2: Check Produksi Transactions =====
    const { data: produksi, error: produksiError } = await supabase
      .from('transaksi_produksi')
      .select('id, tanggal, produk_id, jumlah, cabang_id, status')
      .eq('status', 'posted')
      .order('tanggal', { ascending: true });

    if (produksiError) throw produksiError;

    console.log(`🏭 Found ${produksi?.length || 0} produksi transactions`);

    if (produksi && produksi.length > 0) {
      // Get all produk info for produksi
      const produksiProdukIds = [...new Set(produksi.map(p => p.produk_id))];
      const { data: produksiProdukData, error: produksiProdukError } = await supabase
        .from('produk')
        .select('id, nama_produk, kode_produk, hpp')
        .in('id', produksiProdukIds);

      if (produksiProdukError) throw produksiProdukError;

      const produksiProdukMap = new Map(produksiProdukData?.map(p => [p.id, p]) || []);

      // Check each produksi
      for (const prod of produksi) {
        const produk = produksiProdukMap.get(prod.produk_id);
        
        // Check if stock_barang entry exists
        const { data: existing, error: checkError } = await supabase
          .from('stock_barang')
          .select('id')
          .eq('produk_id', prod.produk_id)
          .eq('cabang_id', prod.cabang_id)
          .eq('tanggal', prod.tanggal)
          .eq('tipe', 'masuk')
          .eq('jumlah', prod.jumlah)
          .ilike('keterangan', `%Produksi%${prod.id}%`)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (!existing) {
          const missingData = {
            produksi_id: prod.id,
            tanggal: prod.tanggal,
            produk_id: prod.produk_id,
            nama_produk: produk?.nama_produk || 'Unknown',
            cabang_id: prod.cabang_id,
            jumlah: prod.jumlah,
            hpp: produk?.hpp || 0,
          };

          results.produksi_missing.push(missingData);

          // If mode is 'fix', insert the missing record
          if (mode === 'fix') {
            const { error: insertError } = await supabase
              .from('stock_barang')
              .insert({
                produk_id: prod.produk_id,
                cabang_id: prod.cabang_id,
                tanggal: prod.tanggal,
                jumlah: prod.jumlah,
                tipe: 'masuk',
                keterangan: `Produksi - ${prod.id}`,
                hpp: produk?.hpp || 0,
                harga_jual: (produk?.hpp || 0) * 1.2,
                persentase: 20,
              });

            if (insertError) {
              console.error(`❌ Failed to insert produksi stock:`, insertError);
              results.errors.push({
                type: 'produksi',
                produksi_id: prod.id,
                produk: produk?.nama_produk,
                error: insertError.message,
              });
            } else {
              console.log(`✅ Inserted stock for produksi ${prod.id} - ${produk?.nama_produk || 'Unknown'}`);
            }
          }
        }
      }
    }

    // ===== STEP 3: Check Penjualan Konsinyasi =====
    const { data: penjualanKonsinyasi, error: konsinyasiError } = await supabase
      .from('penjualan_konsinyasi')
      .select(`
        id,
        tanggal_jual,
        jumlah_terjual,
        detail_konsinyasi_id
      `)
      .order('tanggal_jual', { ascending: true });

    if (konsinyasiError) throw konsinyasiError;

    console.log(`🏪 Found ${penjualanKonsinyasi?.length || 0} penjualan konsinyasi`);

    if (penjualanKonsinyasi && penjualanKonsinyasi.length > 0) {
      // Get detail konsinyasi to get produk_id
      const detailKonsinyasiIds = [...new Set(penjualanKonsinyasi.map(pk => pk.detail_konsinyasi_id))];
      const { data: detailKonsinyasi, error: detailKonsError } = await supabase
        .from('detail_konsinyasi')
        .select('id, produk_id, konsinyasi_id')
        .in('id', detailKonsinyasiIds);

      if (detailKonsError) throw detailKonsError;

      const detailKonsMap = new Map(detailKonsinyasi?.map(dk => [dk.id, dk]) || []);

      // Get transaksi konsinyasi to get cabang_id
      const konsinyasiIds = [...new Set(detailKonsinyasi?.map(dk => dk.konsinyasi_id) || [])];
      const { data: transaksiKonsinyasi, error: transaksiKonsError } = await supabase
        .from('transaksi_konsinyasi')
        .select('id, cabang_id')
        .in('id', konsinyasiIds);

      if (transaksiKonsError) throw transaksiKonsError;

      const transaksiKonsMap = new Map(transaksiKonsinyasi?.map(tk => [tk.id, tk]) || []);

      // Get produk info
      const konsProdukIds = [...new Set(detailKonsinyasi?.map(dk => dk.produk_id) || [])];
      const { data: konsProdukData, error: konsProdukError } = await supabase
        .from('produk')
        .select('id, nama_produk')
        .in('id', konsProdukIds);

      if (konsProdukError) throw konsProdukError;

      const konsProdukMap = new Map(konsProdukData?.map(p => [p.id, p]) || []);

      // Check each penjualan konsinyasi
      for (const pk of penjualanKonsinyasi) {
        const detail = detailKonsMap.get(pk.detail_konsinyasi_id);
        if (!detail) continue;

        const transaksi = transaksiKonsMap.get(detail.konsinyasi_id);
        if (!transaksi) continue;

        const produk = konsProdukMap.get(detail.produk_id);

        // Check if stock_barang entry exists
        const { data: existing, error: checkError } = await supabase
          .from('stock_barang')
          .select('id')
          .eq('produk_id', detail.produk_id)
          .eq('cabang_id', transaksi.cabang_id)
          .eq('tanggal', pk.tanggal_jual)
          .eq('tipe', 'keluar')
          .eq('jumlah', pk.jumlah_terjual)
          .ilike('keterangan', `%Konsinyasi%${pk.id}%`)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (!existing) {
          const missingData = {
            konsinyasi_id: pk.id,
            tanggal: pk.tanggal_jual,
            produk_id: detail.produk_id,
            nama_produk: produk?.nama_produk || 'Unknown',
            cabang_id: transaksi.cabang_id,
            jumlah: pk.jumlah_terjual,
          };

          results.penjualan_konsinyasi_missing.push(missingData);

          // If mode is 'fix', insert the missing record
          if (mode === 'fix') {
            const { error: insertError } = await supabase
              .from('stock_barang')
              .insert({
                produk_id: detail.produk_id,
                cabang_id: transaksi.cabang_id,
                tanggal: pk.tanggal_jual,
                jumlah: pk.jumlah_terjual,
                tipe: 'keluar',
                keterangan: `Penjualan Konsinyasi - ${pk.id}`,
                hpp: 0,
                harga_jual: 0,
                persentase: 0,
              });

            if (insertError) {
              console.error(`❌ Failed to insert konsinyasi stock:`, insertError);
              results.errors.push({
                type: 'konsinyasi',
                konsinyasi_id: pk.id,
                produk: produk?.nama_produk,
                error: insertError.message,
              });
            } else {
              console.log(`✅ Inserted stock for konsinyasi ${pk.id} - ${produk?.nama_produk || 'Unknown'}`);
            }
          }
        }
      }
    }

    // ===== STEP 4: Check Stock Opname =====
    const { data: stockOpname, error: opnameError } = await supabase
      .from('stock_opname')
      .select('id, tanggal, produk_id, cabang_id, selisih, status')
      .eq('status', 'approved')
      .order('tanggal', { ascending: true });

    if (opnameError) throw opnameError;

    console.log(`📋 Found ${stockOpname?.length || 0} stock opname`);

    if (stockOpname && stockOpname.length > 0) {
      // Get produk info
      const opnameProdukIds = [...new Set(stockOpname.map(so => so.produk_id))];
      const { data: opnameProdukData, error: opnameProdukError } = await supabase
        .from('produk')
        .select('id, nama_produk')
        .in('id', opnameProdukIds);

      if (opnameProdukError) throw opnameProdukError;

      const opnameProdukMap = new Map(opnameProdukData?.map(p => [p.id, p]) || []);

      // Check each stock opname
      for (const so of stockOpname) {
        const produk = opnameProdukMap.get(so.produk_id);
        const selisih = parseFloat(so.selisih.toString());

        // Skip if no difference
        if (Math.abs(selisih) < 0.01) continue;

        // Check if stock_barang entry exists
        const { data: existing, error: checkError } = await supabase
          .from('stock_barang')
          .select('id')
          .eq('produk_id', so.produk_id)
          .eq('cabang_id', so.cabang_id)
          .eq('tanggal', so.tanggal)
          .eq('jumlah', Math.abs(selisih))
          .ilike('keterangan', `%Opname%${so.id}%`)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (!existing) {
          const missingData = {
            opname_id: so.id,
            tanggal: so.tanggal,
            produk_id: so.produk_id,
            nama_produk: produk?.nama_produk || 'Unknown',
            cabang_id: so.cabang_id,
            selisih: selisih,
            tipe: selisih > 0 ? 'masuk' : 'keluar',
          };

          results.stock_opname_missing.push(missingData);

          // If mode is 'fix', insert the missing record
          if (mode === 'fix') {
            const { error: insertError } = await supabase
              .from('stock_barang')
              .insert({
                produk_id: so.produk_id,
                cabang_id: so.cabang_id,
                tanggal: so.tanggal,
                jumlah: Math.abs(selisih),
                tipe: selisih > 0 ? 'masuk' : 'keluar',
                keterangan: `Stock Opname Adjustment - ${so.id}`,
                hpp: 0,
                harga_jual: 0,
                persentase: 0,
              });

            if (insertError) {
              console.error(`❌ Failed to insert opname stock:`, insertError);
              results.errors.push({
                type: 'opname',
                opname_id: so.id,
                produk: produk?.nama_produk,
                error: insertError.message,
              });
            } else {
              console.log(`✅ Inserted stock for opname ${so.id} - ${produk?.nama_produk || 'Unknown'}`);
            }
          }
        }
      }
    }

    // ===== STEP 5: Check Detail Produksi (Bahan Baku) =====
    const { data: detailProduksi, error: detailProduksiError } = await supabase
      .from('detail_produksi')
      .select(`
        id,
        produksi_id,
        item_id,
        jumlah
      `);

    if (detailProduksiError) throw detailProduksiError;

    console.log(`🏭 Found ${detailProduksi?.length || 0} detail produksi (bahan baku)`);

    if (detailProduksi && detailProduksi.length > 0) {
      // Get transaksi produksi info
      const produksiIds = [...new Set(detailProduksi.map(dp => dp.produksi_id))];
      const { data: produksiData, error: produksiDataError } = await supabase
        .from('transaksi_produksi')
        .select('id, tanggal, cabang_id, status')
        .in('id', produksiIds)
        .eq('status', 'posted');

      if (produksiDataError) throw produksiDataError;

      const produksiMap = new Map(produksiData?.map(p => [p.id, p]) || []);

      // Get produk (bahan baku) info
      const itemIds = [...new Set(detailProduksi.map(dp => dp.item_id))];
      const { data: itemData, error: itemError } = await supabase
        .from('produk')
        .select('id, nama_produk')
        .in('id', itemIds);

      if (itemError) throw itemError;

      const itemMap = new Map(itemData?.map(i => [i.id, i]) || []);

      // Check each detail produksi
      for (const dp of detailProduksi) {
        const produksi = produksiMap.get(dp.produksi_id);
        if (!produksi) continue; // Skip if produksi not posted

        const item = itemMap.get(dp.item_id);

        // Check if stock_barang entry exists
        const { data: existing, error: checkError } = await supabase
          .from('stock_barang')
          .select('id')
          .eq('produk_id', dp.item_id)
          .eq('cabang_id', produksi.cabang_id)
          .eq('tanggal', produksi.tanggal)
          .eq('tipe', 'keluar')
          .eq('jumlah', dp.jumlah)
          .ilike('keterangan', `%Bahan Produksi%${dp.produksi_id}%`)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (!existing) {
          const missingData = {
            detail_produksi_id: dp.id,
            produksi_id: dp.produksi_id,
            tanggal: produksi.tanggal,
            item_id: dp.item_id,
            nama_item: item?.nama_produk || 'Unknown',
            cabang_id: produksi.cabang_id,
            jumlah: dp.jumlah,
          };

          results.detail_produksi_missing.push(missingData);

          // If mode is 'fix', insert the missing record
          if (mode === 'fix') {
            const { error: insertError } = await supabase
              .from('stock_barang')
              .insert({
                produk_id: dp.item_id,
                cabang_id: produksi.cabang_id,
                tanggal: produksi.tanggal,
                jumlah: dp.jumlah,
                tipe: 'keluar',
                keterangan: `Bahan Produksi - ${dp.produksi_id}`,
                hpp: 0,
                harga_jual: 0,
                persentase: 0,
              });

            if (insertError) {
              console.error(`❌ Failed to insert bahan produksi stock:`, insertError);
              results.errors.push({
                type: 'detail_produksi',
                produksi_id: dp.produksi_id,
                item: item?.nama_produk,
                error: insertError.message,
              });
            } else {
              console.log(`✅ Inserted stock for bahan produksi ${dp.produksi_id} - ${item?.nama_produk || 'Unknown'}`);
            }
          }
        }
      }
    }

    // ===== STEP 6: Recalculate Stock if fixing =====
    if (mode === 'fix') {
      // Get all movements
      const { data: movements, error: movementsError } = await supabase
        .from('stock_barang')
        .select('produk_id, jumlah, tipe, tanggal')
        .order('produk_id', { ascending: true })
        .order('tanggal', { ascending: true });

      if (movementsError) throw movementsError;

      // Get all produk
      const movementProdukIds = [...new Set(movements?.map(m => m.produk_id) || [])];
      const { data: movementProdukData, error: movementProdukError } = await supabase
        .from('produk')
        .select('id, nama_produk, stok')
        .in('id', movementProdukIds);

      if (movementProdukError) throw movementProdukError;

      const movementProdukMap = new Map(movementProdukData?.map(p => [p.id, p]) || []);

      // Group by produk_id
      const stockByProduk = new Map<number, any>();

      movements?.forEach((item: any) => {
        const produk = movementProdukMap.get(item.produk_id);
        
        if (!stockByProduk.has(item.produk_id)) {
          stockByProduk.set(item.produk_id, {
            produk_id: item.produk_id,
            nama_produk: produk?.nama_produk || 'Unknown',
            calculated_stock: 0,
            db_stock: parseFloat(produk?.stok?.toString() || '0'),
          });
        }

        const produkData = stockByProduk.get(item.produk_id);
        const jumlah = parseFloat(item.jumlah.toString());

        if (item.tipe === 'masuk') {
          produkData.calculated_stock += jumlah;
        } else if (item.tipe === 'keluar') {
          produkData.calculated_stock -= jumlah;
        }
      });

      // Update stock in produk table
      for (const [produkId, data] of stockByProduk.entries()) {
        const difference = Math.abs(data.calculated_stock - data.db_stock);

        if (difference > 0.01) {
          const { error: updateError } = await supabase
            .from('produk')
            .update({ stok: data.calculated_stock })
            .eq('id', produkId);

          if (updateError) {
            results.errors.push({
              type: 'stock_update',
              produk_id: produkId,
              error: updateError.message,
            });
          } else {
            results.stock_fixed.push({
              produk_id: produkId,
              nama_produk: data.nama_produk,
              old_stock: data.db_stock,
              new_stock: data.calculated_stock,
              difference: data.calculated_stock - data.db_stock,
            });
          }
        }
      }
    }

    // Summary
    const summary = {
      mode: mode,
      pembelian_missing: results.pembelian_missing.length,
      produksi_missing: results.produksi_missing.length,
      penjualan_konsinyasi_missing: results.penjualan_konsinyasi_missing.length,
      stock_opname_missing: results.stock_opname_missing.length,
      detail_produksi_missing: results.detail_produksi_missing.length,
      stock_fixed: results.stock_fixed.length,
      errors: results.errors.length,
    };

    console.log('📊 Summary:', summary);

    return NextResponse.json({
      success: true,
      message: mode === 'check' 
        ? 'Check completed - use mode:"fix" to apply changes'
        : 'Fix completed successfully',
      summary,
      details: {
        pembelian_missing: results.pembelian_missing,
        produksi_missing: results.produksi_missing,
        penjualan_konsinyasi_missing: results.penjualan_konsinyasi_missing,
        stock_opname_missing: results.stock_opname_missing,
        detail_produksi_missing: results.detail_produksi_missing,
        stock_fixed: results.stock_fixed,
        errors: results.errors,
      },
    });
  } catch (error: any) {
    console.error('❌ Error in comprehensive fix:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}