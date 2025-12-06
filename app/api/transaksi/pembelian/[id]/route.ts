// app/api/transaksi/pembelian/[id]/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { calculatePembelianTotals } from '@/lib/transaksi/calculatePembelianTotals';

// GET - Detail pembelian by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    console.log('Fetching pembelian with id:', id);

    // Validasi ID
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'ID tidak valid' },
        { status: 400 }
      );
    }

    // Query dengan select relasi yang lengkap
    const { data: pembelian, error: pembelianError } = await supabase
      .from('transaksi_pembelian')
      .select('*')
      .eq('id', id)
      .single();

    if (pembelianError) {
      console.error('Supabase error:', pembelianError);
      return NextResponse.json(
        { error: pembelianError.message, details: pembelianError },
        { status: 500 }
      );
    }

    if (!pembelian) {
      console.log('No data found for id:', id);
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    // Fetch related data separately untuk memastikan data lengkap
    const { data: suplier } = await supabase
      .from('suplier')
      .select('id, nama, cabang_id')
      .eq('id', pembelian.suplier_id)
      .single();

    const { data: cabang } = await supabase
      .from('cabang')
      .select('id, nama_cabang, kode_cabang')
      .eq('id', pembelian.cabang_id)
      .single();

    const { data: detail_pembelian } = await supabase
      .from('detail_pembelian')
      .select('*')
      .eq('pembelian_id', id);

    // ✅ PENTING: Fetch produk untuk setiap detail dengan kode_produk
    const detailsWithProduk = await Promise.all(
      (detail_pembelian || []).map(async (detail) => {
        const { data: produk, error: produkError } = await supabase
          .from('produk')
          .select('id, nama_produk, kode_produk, satuan, is_jerigen, harga, hpp')
          .eq('id', detail.produk_id)
          .single();
        
        if (produkError) {
          console.error('Error fetching produk for detail:', detail.id, produkError);
        }
        
        console.log('Produk data for detail', detail.id, ':', produk);
        
        return { ...detail, produk };
      })
    );

    const data = {
      ...pembelian,
      suplier,
      cabang,
      detail_pembelian: detailsWithProduk
    };

    // Compute canonical totals and outstanding tagihan
    try {
      const { subtotal, finalTotal } = calculatePembelianTotals(data as any);

      const { data: cicilanList } = await supabase
        .from('cicilan_pembelian')
        .select('jumlah_cicilan')
        .eq('pembelian_id', id);

      const totalCicilan = (cicilanList || []).reduce((s: number, c: any) => s + Number(c.jumlah_cicilan || 0), 0);
      const tagihan = Math.max(0, finalTotal - ((data.uang_muka || 0) + totalCicilan));

      data.subtotal = subtotal;
      data.finalTotal = finalTotal;
      data.tagihan = tagihan;
    } catch (e) {
      console.warn('Could not compute totals for pembelian detail', e);
    }

    console.log('Data found with', data.detail_pembelian?.length || 0, 'details');
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Exception:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// 🔍 Helper: Check if purchase stock has been consumed by sales
async function checkPurchaseStockConsumed(purchaseId: number) {
  try {
    const supabase = await supabaseServer();

    // Step 1: Get purchased items and quantities
    const { data: purchaseDetails } = await supabase
      .from('detail_pembelian')
      .select('produk_id, jumlah')
      .eq('pembelian_id', purchaseId);

    if (!purchaseDetails || purchaseDetails.length === 0) {
      return 0; // No stock was ever added from this purchase
    }

    let totalConsumedFromPurchase = 0;

    // Step 2: For each purchased product, check if stock level has decreased
    for (const detail of purchaseDetails) {
      const purchasedAmount = parseFloat(detail.jumlah?.toString() || '0');

      // Get current stock level
      const { data: currentStock } = await supabase
        .from('produk')
        .select('stok, nama_produk')
        .eq('id', detail.produk_id)
        .single();

      const currentStockLevel = parseFloat(currentStock?.stok?.toString() || '0');

      console.log(`🔍 Purchase ${purchaseId} - ${currentStock?.nama_produk}: Purchased ${purchasedAmount}, Current stock: ${currentStockLevel}`);

      // If current stock is less than purchased amount, it was consumed
      // This accounts for sales, consignment, stock opname, or any consumption
      const consumedForProduct = purchasedAmount - currentStockLevel;

      if (consumedForProduct > 0) {
        totalConsumedFromPurchase += consumedForProduct;
        console.log(`  ❌ Consumed: ${consumedForProduct} units`);
      }
    }

    if (totalConsumedFromPurchase > 0) {
      console.log(`❌ Purchase ${purchaseId} stock consumed: ${totalConsumedFromPurchase} units`);
      return totalConsumedFromPurchase;
    }

    console.log(`✅ Purchase ${purchaseId} stock not consumed`);
    return 0;

  } catch (error) {
    console.error('Error checking purchase stock consumption:', error);
    throw error;
  }
}

// Move helper function to end of file

// PATCH - Update pembelian
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;
    const body = await request.json();

    console.log('PATCH request for id:', id);
    console.log('Request body:', body);

    // Validasi ID
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'ID tidak valid' },
        { status: 400 }
      );
    }

    // Update data
    const { data: updatedRow, error } = await supabase
      .from('transaksi_pembelian')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Data updated successfully');
    return NextResponse.json({
      message: 'Data berhasil diupdate',
      data: updatedRow
    });
  } catch (error: any) {
    console.error('Error in PATCH:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete pembelian dan semua data terkait dengan STOCK SAFETY
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    console.log('🔒 Checking purchase safety before delete:', id);

    // Validasi ID
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'ID tidak valid' },
        { status: 400 }
      );
    }

    // 🔍 STEP 1: VERIFY STOCK RECEIVED HASN'T BEEN CONSUMED
    const purchaseId = parseInt(id);
    const consumedStock = await checkPurchaseStockConsumed(purchaseId);

    if (consumedStock > 0) {
      console.log(`❌ BLOCKED: Purchase ${purchaseId} has ${consumedStock} units consumed`);
      return NextResponse.json({
        error: 'Cannot delete data, because it will result in negative stock. Please delete the sales/consignment data first.'
      }, { status: 400 });
    }

    console.log('✅ SAFE: No stock consumption detected, proceeding with deletion and kas return...');

    // 1. Get all cicilan untuk kembalikan kas
    const { data: cicilanList } = await supabase
      .from('cicilan_pembelian')
      .select('id, jumlah_cicilan, rekening')
      .eq('pembelian_id', id);

    // Kembalikan saldo kas untuk setiap cicilan
    if (cicilanList && cicilanList.length > 0) {
      for (const cicilan of cicilanList) {
        if (!cicilan.rekening) continue;
        
        const { data: kas } = await supabase
          .from('kas')
          .select('*')
          .eq('nama_kas', cicilan.rekening)
          .single();

        if (kas) {
          const kasSaldo = parseFloat(kas.saldo.toString());
          const jumlahKembali = parseFloat(cicilan.jumlah_cicilan.toString());
          const newSaldo = kasSaldo + jumlahKembali;

          await supabase
            .from('kas')
            .update({ saldo: newSaldo })
            .eq('id', kas.id);

          console.log(`Kas ${kas.nama_kas} dikembalikan: ${kasSaldo} + ${jumlahKembali} = ${newSaldo}`);

          // Insert transaksi kas (kredit = masuk/dikembalikan)
          await supabase
            .from('transaksi_kas')
            .insert({
              kas_id: kas.id,
              tanggal_transaksi: new Date().toISOString().split('T')[0],
              debit: 0,
              kredit: jumlahKembali,
              keterangan: `Pembatalan pembelian (ID: ${id})`
            });
        }
      }
    }

    // 2. Hapus cicilan_pembelian
    const { error: cicilanError } = await supabase
      .from('cicilan_pembelian')
      .delete()
      .eq('pembelian_id', id);

    if (cicilanError) {
      console.error('Error deleting cicilan:', cicilanError);
      throw cicilanError;
    }

    // 3. Hapus hutang_pembelian
    const { error: hutangError } = await supabase
      .from('hutang_pembelian')
      .delete()
      .eq('pembelian_id', id);

    if (hutangError) {
      console.error('Error deleting hutang:', hutangError);
      throw hutangError;
    }

    // 4. Hapus detail_pembelian
    const { error: detailError } = await supabase
      .from('detail_pembelian')
      .delete()
      .eq('pembelian_id', id);

    if (detailError) {
      console.error('Error deleting details:', detailError);
      throw detailError;
    }

    // 5. Terakhir, hapus transaksi_pembelian
    const { error } = await supabase
      .from('transaksi_pembelian')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pembelian:', error);
      throw error;
    }

    console.log('Successfully deleted pembelian and all related data');
    console.log(`Returned ${cicilanList?.length || 0} payments to kas`);
    
    return NextResponse.json({ 
      message: 'Data berhasil dihapus dan saldo kas dikembalikan',
      deleted: {
        pembelian_id: id,
        cicilan: cicilanList?.length || 0,
        hutang: true,
        detail: true,
        kas_returned: true
      }
    });
  } catch (error: any) {
    console.error('Exception in DELETE:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
