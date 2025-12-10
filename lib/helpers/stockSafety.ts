// lib/helpers/stockSafety.ts
import { supabaseAuthenticated } from '@/lib/supabaseServer';

// ============================================================
// Validate Stock Deletion Safety
// ============================================================
export async function validateStockDeletion(
  transactionType: 'penjualan' | 'pembelian' | 'konsinyasi' | 'produksi' | 'unloading',
  transactionId: number
) {
  const supabase = await supabaseAuthenticated();
  
  const foreignKeyColumn = `${transactionType}_id`;
  
  // Get stock records via foreign key
  const { data: stockRecords, error } = await supabase
    .from('stock_barang')
    .select(`
      id, 
      produk_id, 
      jumlah, 
      tipe,
      produk:produk_id(nama_produk, stok)
    `)
    .eq(foreignKeyColumn, transactionId);

  if (error) {
    throw new Error(`Failed to check stock records: ${error.message}`);
  }

  if (!stockRecords || stockRecords.length === 0) {
    return { 
      safe: true, 
      message: 'No stock to restore',
      records: []
    };
  }

  // Validate each stock record
  const validationResults = [];
  
  for (const record of stockRecords) {
    const produk = record.produk as any;
    if (!produk) continue;

    const currentStock = parseFloat(produk.stok?.toString() || '0');
    const recordAmount = parseFloat(record.jumlah?.toString() || '0');
    
    // Calculate new stock after reversal
    const newStock = record.tipe === 'keluar' 
      ? currentStock + recordAmount  // Return stock
      : currentStock - recordAmount; // Remove stock
    
    if (newStock < 0) {
      return {
        safe: false,
        message: `Stock ${produk.nama_produk} akan negatif (${newStock}). Kemungkinan sudah dipakai untuk transaksi lain.`,
        produk: produk.nama_produk,
        currentStock,
        recordAmount,
        newStock
      };
    }
    
    validationResults.push({
      produk_id: record.produk_id,
      produk_nama: produk.nama_produk,
      current: currentStock,
      change: record.tipe === 'keluar' ? `+${recordAmount}` : `-${recordAmount}`,
      after: newStock,
      safe: true
    });
  }

  return { 
    safe: true,
    message: `All ${stockRecords.length} products can be safely restored`,
    records: validationResults
  };
}

// ============================================================
// Restore Stock from Transaction
// ============================================================
export async function restoreStock(
  transactionType: 'penjualan' | 'pembelian' | 'konsinyasi' | 'produksi' | 'unloading',
  transactionId: number
) {
  const supabase = await supabaseAuthenticated();
  const foreignKeyColumn = `${transactionType}_id`;
  
  // Step 1: Validate first
  const validation = await validateStockDeletion(transactionType, transactionId);
  if (!validation.safe) {
    throw new Error(validation.message);
  }

  // Step 2: Get stock records
  const { data: stockRecords } = await supabase
    .from('stock_barang')
    .select('id, produk_id, jumlah, tipe')
    .eq(foreignKeyColumn, transactionId);

  if (!stockRecords || stockRecords.length === 0) {
    return { restored: false, count: 0, products: [] };
  }

  // Step 3: Restore each product
  const restoredProducts = [];
  
  for (const record of stockRecords) {
    const { data: produk, error: produkError } = await supabase
      .from('produk')
      .select('stok, nama_produk')
      .eq('id', record.produk_id)
      .single();

    if (produkError || !produk) {
      console.error(`Failed to get produk ${record.produk_id}:`, produkError);
      continue;
    }

    const currentStock = parseFloat(produk.stok?.toString() || '0');
    const recordAmount = parseFloat(record.jumlah?.toString() || '0');
    
    const newStock = record.tipe === 'keluar'
      ? currentStock + recordAmount
      : currentStock - recordAmount;

    // Update produk stock
    const { error: updateError } = await supabase
      .from('produk')
      .update({ 
        stok: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', record.produk_id);

    if (updateError) {
      throw new Error(`Failed to restore stock for ${produk.nama_produk}: ${updateError.message}`);
    }

    restoredProducts.push({
      produk: produk.nama_produk,
      from: currentStock,
      to: newStock,
      change: record.tipe === 'keluar' ? `+${recordAmount}` : `-${recordAmount}`
    });
  }

  // Step 4: Delete stock records (CASCADE should handle this, but explicit is safer)
  const { error: deleteError } = await supabase
    .from('stock_barang')
    .delete()
    .eq(foreignKeyColumn, transactionId);

  if (deleteError) {
    console.error('⚠️ Warning: Failed to delete stock records:', deleteError);
  }

  return {
    restored: true,
    count: restoredProducts.length,
    products: restoredProducts
  };
}

// ============================================================
// Restore Kas from Transaction
// ============================================================
export async function restoreKasFromTransaction(
  kasId: number,
  amount: number,
  transactionNote: string,
  isIncoming: boolean = false // true = money came in (kredit), false = money went out (debit)
) {
  const supabase = await supabaseAuthenticated();

  // Get current kas balance
  const { data: kas, error: kasError } = await supabase
    .from('kas')
    .select('saldo, nama_kas')
    .eq('id', kasId)
    .single();

  if (kasError) {
    throw new Error(`Failed to get kas data: ${kasError.message}`);
  }

  if (!kas) {
    throw new Error('Kas not found');
  }

  const currentSaldo = parseFloat(kas.saldo?.toString() || '0');
  
  // For reversal: if money came in, we subtract; if money went out, we add back
  const newSaldo = isIncoming 
    ? currentSaldo - amount  // Reverse kredit
    : currentSaldo + amount; // Reverse debit

  // Validate
  if (newSaldo < 0) {
    throw new Error(`Cannot restore kas ${kas.nama_kas}. Balance would be negative (${newSaldo}).`);
  }

  // Update kas
  const { error: updateError } = await supabase
    .from('kas')
    .update({ saldo: newSaldo })
    .eq('id', kasId);

  if (updateError) {
    throw new Error(`Failed to update kas: ${updateError.message}`);
  }

  // Delete related transaksi_kas
  await supabase
    .from('transaksi_kas')
    .delete()
    .eq('kas_id', kasId)
    .ilike('keterangan', `%${transactionNote}%`);

  return {
    restored: true,
    kas: kas.nama_kas,
    from: currentSaldo,
    to: newSaldo,
    amount: amount
  };
}

// ============================================================
// Audit Log Helper
// ============================================================
export async function logAuditTrail(
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  tableName: string,
  recordId: number,
  oldData?: any,
  newData?: any,
  userId?: number,
  ipAddress?: string
) {
  try {
    const supabase = await supabaseAuthenticated();
    
    await supabase.from('audit_log').insert({
      user_id: userId || null,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData || null,
      new_data: newData || null,
      ip_address: ipAddress,
      created_at: new Date().toISOString()
    });
    
    console.log(`📝 Audit log: ${action} ${tableName} #${recordId}`);
  } catch (error) {
    console.error('⚠️ Failed to log audit trail:', error);
    // Don't throw - audit logging should not block operations
  }
}

// ============================================================
// Data Migration Helper - Fix Orphaned Foreign Keys
// ============================================================
export async function fixOrphanedStockReferences() {
  const supabase = await supabaseAuthenticated();

  console.log('🔧 Starting stock reference cleanup...');

  // Find orphaned stock records
  const { data: orphanedStock, error: findError } = await supabase
    .from('stock_barang')
    .select('id, produk_id, penjualan_id, pembelian_id, produksi_id, konsinyasi_id, keterangan')
    .or('penjualan_id.not.is.null,pembelian_id.not.is.null,produksi_id.not.is.null,konsinyasi_id.not.is.null');

  if (findError) {
    throw new Error(`Failed to find orphaned stock records: ${findError.message}`);
  }

  const results = {
    processed: 0,
    fixed: 0,
    deleted: 0,
    errors: [] as string[]
  };

  // Check each stock record against referenced transaction
  for (const stock of orphanedStock || []) {
    try {
      results.processed++;

      let exists = false;
      let tableName = '';

      if (stock.penjualan_id) {
        const { data } = await supabase
          .from('transaksi_penjualan')
          .select('id')
          .eq('id', stock.penjualan_id)
          .maybeSingle();
        exists = !!data;
        tableName = 'transaksi_penjualan';
      } else if (stock.pembelian_id) {
        const { data } = await supabase
          .from('transaksi_pembelian')
          .select('id')
          .eq('id', stock.pembelian_id)
          .maybeSingle();
        exists = !!data;
        tableName = 'transaksi_pembelian';
      } else if (stock.produksi_id) {
        const { data } = await supabase
          .from('transaksi_produksi')
          .select('id')
          .eq('id', stock.produksi_id)
          .maybeSingle();
        exists = !!data;
        tableName = 'transaksi_produksi';
      } else if (stock.konsinyasi_id) {
        // Assuming konsinyasi table - adjust as needed
        const { data } = await supabase
          .from('penjualan_konsinyasi')
          .select('id')
          .eq('id', stock.konsinyasi_id)
          .maybeSingle();
        exists = !!data;
        tableName = 'penjualan_konsinyasi';
      }

      if (!exists) {
        // Foreign key points to non-existent record - NULL it out
        const updateData: any = {};

        if (stock.penjualan_id) updateData.penjualan_id = null;
        if (stock.pembelian_id) updateData.pembelian_id = null;
        if (stock.produksi_id) updateData.produksi_id = null;
        if (stock.konsinyasi_id) updateData.konsinyasi_id = null;

        const { error: updateError } = await supabase
          .from('stock_barang')
          .update(updateData)
          .eq('id', stock.id);

        if (updateError) {
          results.errors.push(`Failed to null FK for stock ${stock.id}: ${updateError.message}`);
        } else {
          console.log(`✅ Fixed orphaned stock ${stock.id} (was referencing ${tableName})`);
          results.fixed++;
        }
      }

    } catch (error: any) {
      results.errors.push(`Error processing stock ${stock.id}: ${error.message}`);
    }
  }

  console.log(`🎯 Stock cleanup complete: ${results.processed} processed, ${results.fixed} fixed, ${results.errors.length} errors`);

  return results;
}

// ============================================================
// Update produksi_id based on keterangan pattern (SAFE VERSION)
// ============================================================
export async function migrateProductionIdsFromKeterangan() {
  const supabase = await supabaseAuthenticated();

  console.log('🔄 Starting produksi_id migration from keterangan...');

  // Only process records where produksi_id is NULL
  const { data: stockRecords, error: findError } = await supabase
    .from('stock_barang')
    .select('id, keterangan, produksi_id')
    .is('produksi_id', null)
    .like('keterangan', '%Produksi ID: %');

  if (findError) {
    throw new Error(`Failed to find stock records: ${findError.message}`);
  }

  const results = {
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: [] as string[]
  };

  for (const stock of stockRecords || []) {
    try {
      results.processed++;

      // Extract production ID from keterangan
      // Format: "Produksi ID: 123 (Bahan Baku)" or similar
      const match = stock.keterangan.match(/Produksi ID:\s*(\d+)/);

      if (!match) {
        results.skipped++;
        continue;
      }

      const extractedProduksiId = parseInt(match[1]);

      if (isNaN(extractedProduksiId)) {
        results.errors.push(`Invalid production ID extracted from keterangan: "${stock.keterangan}"`);
        continue;
      }

      // Verify the production actually exists
      const { data: productionExists } = await supabase
        .from('transaksi_produksi')
        .select('id')
        .eq('id', extractedProduksiId)
        .maybeSingle();

      if (!productionExists) {
        console.log(`⚠️ Production ${extractedProduksiId} no longer exists, skipping stock ${stock.id}`);
        results.skipped++;
        continue;
      }

      // Migrate the foreign key
      const { error: migrateError } = await supabase
        .from('stock_barang')
        .update({ produksi_id: extractedProduksiId })
        .eq('id', stock.id);

      if (migrateError) {
        results.errors.push(`Failed to migrate stock ${stock.id}: ${migrateError.message}`);
      } else {
        console.log(`✅ Migrated stock ${stock.id} → produksi_id: ${extractedProduksiId}`);
        results.migrated++;
      }

    } catch (error: any) {
      results.errors.push(`Error processing stock ${stock.id}: ${error.message}`);
    }
  }

  console.log(`🎯 Migration complete: ${results.processed} processed, ${results.migrated} migrated, ${results.skipped} skipped`);

  return results;
}

// ============================================================
// Stock Reconciliation Check
// ============================================================
export async function reconcileStock(produkId: number, cabangId?: number) {
  const supabase = await supabaseAuthenticated();

  // Get all stock movements
  let query = supabase
    .from('stock_barang')
    .select('jumlah, tipe')
    .eq('produk_id', produkId);

  if (cabangId) {
    query = query.eq('cabang_id', cabangId);
  }

  const { data: movements } = await query;

  // Calculate stock from movements
  const calculatedStock = (movements || []).reduce((sum, m) => {
    const amount = parseFloat(m.jumlah?.toString() || '0');
    return m.tipe === 'masuk' ? sum + amount : sum - amount;
  }, 0);

  // Get actual stock
  const { data: produk } = await supabase
    .from('produk')
    .select('stok, nama_produk')
    .eq('id', produkId)
    .single();

  if (!produk) {
    throw new Error('Produk not found');
  }

  const actualStock = parseFloat(produk.stok?.toString() || '0');
  const difference = actualStock - calculatedStock;

  const match = Math.abs(difference) < 0.01; // Allow tiny floating point errors

  if (!match) {
    console.error(`⚠️ Stock mismatch for ${produk.nama_produk}:`);
    console.error(`   Actual: ${actualStock}`);
    console.error(`   Calculated: ${calculatedStock}`);
    console.error(`   Difference: ${difference}`);
  }

  return {
    match,
    produk: produk.nama_produk,
    actual: actualStock,
    calculated: calculatedStock,
    difference,
    movements_count: movements?.length || 0
  };
}
