// app/api/persediaan/stock-opname/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    const { data, error } = await supabase
      .from('stock_opname')
      .select(`
        id,
        tanggal,
        produk:produk_id (
          id,
          nama_produk,
          kode_produk,
          stok,
          hpp
        ),
        cabang:cabang_id (
          id,
          nama_cabang,
          kode_cabang
        ),
        jumlah_sistem,
        jumlah_fisik,
        selisih,
        status,
        keterangan,
        created_at
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching stock opname:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;
    const body = await request.json();

    console.log('🔄 Processing stock opname:', id, 'Status:', body.status);

    // Get opname data
    const { data: opname, error: getError } = await supabase
      .from('stock_opname')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) throw getError;
    if (!opname) {
      return NextResponse.json(
        { error: 'Data stock opname tidak ditemukan' },
        { status: 404 }
      );
    }

    // ✅ FIX: Check if already processed (PREVENT DUPLICATE)
    if (opname.status !== 'pending') {
      console.log('⚠️ Stock opname already processed:', opname.status);
      return NextResponse.json(
        { error: 'Stock opname sudah diproses sebelumnya' },
        { status: 400 }
      );
    }

    // ✅ Update status FIRST (lock this record)
    const { error: updateError } = await supabase
      .from('stock_opname')
      .update({
        status: body.status,
        keterangan: body.keterangan || opname.keterangan,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    console.log('✅ Status updated to:', body.status);

    // If approved, adjust the stock
    if (body.status === 'approved' && Math.abs(opname.selisih) > 0.001) {
      console.log('📊 Adjusting stock...');
      console.log('   Produk ID:', opname.produk_id);
      console.log('   Cabang ID:', opname.cabang_id);
      console.log('   Selisih:', opname.selisih);

      // ✅ CRITICAL: Check if adjustment already recorded
      const { data: existingAdjustment } = await supabase
        .from('stock_barang')
        .select('id')
        .eq('keterangan', `Stock Opname Adjustment - ${id} (Approved)`)
        .limit(1);

      if (existingAdjustment && existingAdjustment.length > 0) {
        console.log('⚠️ Adjustment already recorded, skipping...');
        return NextResponse.json({
          success: true,
          message: 'Stock opname sudah diproses sebelumnya',
        });
      }

      // ✅ Insert adjustment transaction (ONLY ONCE)
      const { error: stockError } = await supabase
        .from('stock_barang')
        .insert({
          produk_id: opname.produk_id,
          cabang_id: opname.cabang_id,
          jumlah: Math.abs(opname.selisih),
          tanggal: opname.tanggal,
          tipe: opname.selisih > 0 ? 'masuk' : 'keluar',
          keterangan: `Stock Opname Adjustment - ${id} (Approved)`,
          hpp: 0,
          harga_jual: 0,
          persentase: 0,
        });

      if (stockError) {
        console.error('❌ Error creating stock adjustment:', stockError);
        throw stockError;
      }

      console.log('✅ Adjustment recorded:', {
        jumlah: Math.abs(opname.selisih),
        tipe: opname.selisih > 0 ? 'masuk' : 'keluar',
      });

      // ✅ FIX: Update stock langsung (jangan recalculate semua!)
      const { data: currentProduk, error: produkGetError } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', opname.produk_id)
        .single();

      if (produkGetError) throw produkGetError;

      const currentStock = parseFloat(currentProduk.stok?.toString() || '0');
      const newStock = opname.selisih > 0 
        ? currentStock + Math.abs(opname.selisih)  // Tambah jika fisik > sistem
        : currentStock - Math.abs(opname.selisih);  // Kurang jika fisik < sistem

      console.log(`📈 Stock update: ${currentStock} → ${newStock}`);

      // Update produk table
      const { error: produkError } = await supabase
        .from('produk')
        .update({ stok: newStock })
        .eq('id', opname.produk_id);

      if (produkError) {
        console.error('❌ Error updating produk:', produkError);
        throw produkError;
      }

      console.log('✅ Produk stock updated to:', newStock);
    }

    return NextResponse.json({
      success: true,
      message: body.status === 'approved' 
        ? 'Stock opname disetujui dan stock telah disesuaikan' 
        : 'Stock opname ditolak',
    });

  } catch (error: any) {
    console.error('❌ Error updating stock opname:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    console.log('🗑️ Deleting stock opname:', id);

    // Get opname data
    const { data: opname, error: getError } = await supabase
      .from('stock_opname')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) throw getError;
    if (!opname) {
      return NextResponse.json(
        { error: 'Data stock opname tidak ditemukan' },
        { status: 404 }
      );
    }

    // Only allow delete if status is pending
    if (opname.status !== 'pending') {
      return NextResponse.json(
        { error: 'Hanya stock opname dengan status pending yang bisa dihapus' },
        { status: 400 }
      );
    }

    // Delete the record
    const { error: deleteError } = await supabase
      .from('stock_opname')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    console.log('✅ Stock opname deleted');

    return NextResponse.json({
      success: true,
      message: 'Stock opname berhasil dihapus',
    });

  } catch (error: any) {
    console.error('❌ Error deleting stock opname:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
