     // app/api/gudang/produksi/[id]/route.ts

     'use server';

     import { NextRequest, NextResponse } from 'next/server';
     import { supabaseServer } from '@/lib/supabaseServer';

     export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
       try {
         const supabase = await supabaseServer();
         const { id } = await params;

         console.log('Fetching produksi detail for ID:', id);

         // Query directly instead of using RPC
         const { data: produksi, error: produksiError } = await supabase
           .from('transaksi_produksi')
           .select(`
             *,
             produk:produk_id (
               id,
               nama_produk,
               kode_produk
             ),
             pegawai:pegawai_id (
               id,
               nama
             ),
             cabang:cabang_id (
               id,
               nama_cabang,
               kode_cabang
             ),
             detail_produksi (
               *,
               item:produk (
                 id,
                 nama_produk,
                 kode_produk
               )
             )
           `)
           .eq('id', parseInt(id))
           .single();

         if (produksiError) {
           console.error('Error fetching produksi:', produksiError);
           throw produksiError;
         }

         if (!produksi) {
           throw new Error('Data tidak ditemukan');
         }

         console.log('Fetched produksi data:', JSON.stringify(produksi, null, 2));

         return NextResponse.json({ data: produksi });
       } catch (error: any) {
         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
         console.error('Error fetching produksi detail:', errorMessage);
         return NextResponse.json({ error: errorMessage }, { status: 500 });
       }
     }


export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();
    const { item_id, jumlah, hpp, subtotal } = body;

    if (!item_id || !jumlah || !hpp || !subtotal) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 });
    }

    // Fix: Await params and destructure id
    const { id } = await params;

    const { data, error } = await supabase
      .from('detail_produksi')
      .insert({
        produksi_id: parseInt(id),  // Use the awaited id
        item_id: parseInt(item_id),
        jumlah: parseFloat(jumlah),
        hpp: parseFloat(hpp),
        subtotal: parseFloat(subtotal),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error adding detail:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    const detailId = searchParams.get('detailId');
    const { id } = await params;

    if (detailId) {
      // Allow detail item deletion (doesn't affect stock safety)
      const { error } = await supabase
        .from('detail_produksi')
        .delete()
        .eq('id', parseInt(detailId));

      if (error) throw error;
      return NextResponse.json({ message: 'Detail deleted' });
    } else {
      // ⚠️ PRODUCTION DELETION - STOCK SAFETY CHECK REQUIRED
      const produksiId = parseInt(id);
      console.log('🔒 Checking production safety before delete:', produksiId);

      // 🔍 STEP 1: VERIFY STOCK HASN'T BEEN CONSUMED
      const consumedStock = await checkProductionStockConsumed(produksiId);

      if (consumedStock > 0) {
        console.log(`❌ BLOCKED: Production ${produksiId} has ${consumedStock} units consumed`);
        return NextResponse.json({
          error: 'Cannot delete data, because it will result in negative stock. Please delete the sales/consignment data first.'
        }, { status: 400 });
      }

      console.log('✅ SAFE: No stock consumption detected, proceeding with reversal...');

      // ✅ STEP 2: REVERSE STOCK MOVEMENTS (since it's safe)
      await reverseProductionStock(produksiId);

      // ✅ STEP 3: DELETE RECORDS
      // Delete all related detail_produksi (to avoid FK constraint errors)
      const { error: deleteDetailsError } = await supabase
        .from('detail_produksi')
        .delete()
        .eq('produksi_id', produksiId);

      if (deleteDetailsError) throw deleteDetailsError;

      // Delete the production record
      const { error: deleteProduksiError } = await supabase
        .from('transaksi_produksi')
        .delete()
        .eq('id', produksiId);

      if (deleteProduksiError) throw deleteProduksiError;

      console.log('✅ SUCCESS: Production deleted with stock properly reversed');

      return NextResponse.json({
        success: true,
        message: 'Production deleted successfully with stock reversal'
      });
    }
  } catch (error: any) {
    console.error('❌ ERROR in production DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🔍 Helper: Check if production stock has been consumed by sales
async function checkProductionStockConsumed(productionId: number) {
  try {
    const supabase = await supabaseServer();

    // Step 1: Get production output (finished product)
    const { data: production } = await supabase
      .from('transaksi_produksi')
      .select('produk_id, jumlah')
      .eq('id', productionId)
      .single();

    if (!production) {
      return 0; // No production found
    }

    // Step 2: Check current stock level of the finished product
    const { data: currentStock } = await supabase
      .from('produk')
      .select('stok, nama_produk')
      .eq('id', production.produk_id)
      .single();

    const currentStockLevel = parseFloat(currentStock?.stok?.toString() || '0');
    const producedAmount = parseFloat(production.jumlah?.toString() || '0');

    console.log(`🔍 Production ${productionId} (${currentStock?.nama_produk}): Produced ${producedAmount}, Current stock: ${currentStockLevel}`);

    // Step 3: If current stock is less than what was produced, stock was consumed
    // This accounts for sales, consignment, stock opname, or any other consumption
    const consumedFromProduction = producedAmount - currentStockLevel;

    if (consumedFromProduction > 0) {
      console.log(`❌ Stock was consumed: ${consumedFromProduction} units`);
      return consumedFromProduction;
    }

    console.log(`✅ No stock consumption detected`);
    return 0;

  } catch (error) {
    console.error('Error checking production stock consumption:', error);
    throw error;
  }
}

// 🔄 Helper: Reverse production stock movements
// 🔄 Helper: Reverse production stock movements
async function reverseProductionStock(productionId: number) {
  try {
    const supabase = await supabaseServer();
    console.log(`🔄 Reversing stock for production ${productionId}...`);

    // Step 1: Get production result FIRST (pindah ke atas)
    const { data: production } = await supabase
      .from('transaksi_produksi')
      .select('produk_id, jumlah')
      .eq('id', productionId)
      .single();

    if (!production) {
      throw new Error('Production data not found');
    }

    // Step 2: REVERSE Raw Material (-) to become (+)
    const { data: details } = await supabase
      .from('detail_produksi')
      .select('item_id, jumlah')
      .eq('produksi_id', productionId);

    if (details) {
      for (const detail of details) {
        // Add back raw materials (+X)
        const { error: updateError } = await supabase
          .from('produk')
          .update({
            stok: (stok: any) => Number(stok) + parseFloat(detail.jumlah?.toString() || '0'),
            updated_at: new Date().toISOString()
          })
          .eq('id', detail.item_id);

        if (updateError) {
          console.error(`Failed to reverse raw material ${detail.item_id}:`, updateError);
          throw updateError;
        }

        console.log(`  ➕ Raw material ${detail.item_id}: +${detail.jumlah}`);
      }
    }

    // Step 3: REVERSE Finished Product (+) to become (-)
    const { error: updateError } = await supabase
      .from('produk')
      .update({
        stok: (stok: any) => Number(stok) - parseFloat(production.jumlah?.toString() || '0'),
        updated_at: new Date().toISOString()
      })
      .eq('id', production.produk_id);

    if (updateError) {
      console.error(`Failed to reverse finished product ${production.produk_id}:`, updateError);
      throw updateError;
    }

    console.log(`  ➖ Finished product ${production.produk_id}: -${production.jumlah}`);

    // Step 4: CLEAN Stock History (remove production movements)
    const { error: cleanError } = await supabase
      .from('stock_barang')
      .delete()
      .or(`keterangan.eq.Hasil Produksi ID: ${productionId},keterangan.eq.Produksi ID: ${productionId} (Bahan Baku)`);

    if (cleanError) {
      console.error('Warning: Failed to clean stock history:', cleanError);
      // Don't throw - history cleanup is secondary
    }

    console.log('✅ Stock reversal completed successfully');

  } catch (error) {
    console.error('❌ Error in reverseProductionStock:', error);
    throw error;
  }
}
