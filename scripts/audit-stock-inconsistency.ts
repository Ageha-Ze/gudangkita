// scripts/audit-stock-inconsistency.ts
// Jalankan: npx tsx scripts/audit-stock-inconsistency.ts
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Environment variables tidak ditemukan!');
  console.error('Pastikan file .env.local ada dan berisi:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function auditStockInconsistency() {
  console.log('🔍 Memulai audit inkonsistensi stock...\n');

  // 1. Ambil semua transaksi stock_barang
  const { data: allTransactions, error: transError } = await supabase
    .from('stock_barang')
    .select(`
      id,
      produk_id,
      cabang_id,
      jumlah,
      tipe,
      tanggal,
      produk:produk_id(nama_produk),
      cabang:cabang_id(nama_cabang)
    `)
    .order('tanggal', { ascending: true });

  if (transError) {
    console.error('❌ Error fetching transactions:', transError);
    return;
  }

  console.log(`📊 Total transaksi: ${allTransactions?.length}\n`);

  // 2. Group by produk_id dan cabang_id
  const stockPerCabang = new Map<string, any>();

  allTransactions?.forEach(t => {
    const key = `${t.produk_id}-${t.cabang_id}`;
    
    if (!stockPerCabang.has(key)) {
      stockPerCabang.set(key, {
        produk_id: t.produk_id,
        nama_produk: (t.produk as any)?.nama_produk,
        cabang_id: t.cabang_id,
        nama_cabang: (t.cabang as any)?.nama_cabang,
        stock: 0,
        transactions: [],
        invalid_transactions: []
      });
    }

    const data = stockPerCabang.get(key);
    const jumlah = parseFloat(t.jumlah?.toString() || '0');

    // Validasi
    if (isNaN(jumlah)) {
      data.invalid_transactions.push({
        id: t.id,
        reason: 'Invalid jumlah (NaN)',
        jumlah: t.jumlah
      });
      return;
    }

    if (!t.tipe || (t.tipe !== 'masuk' && t.tipe !== 'keluar')) {
      data.invalid_transactions.push({
        id: t.id,
        reason: `Invalid tipe: ${t.tipe}`,
        jumlah: t.jumlah
      });
      return;
    }

    // Hitung stock
    if (t.tipe === 'masuk') {
      data.stock += jumlah;
    } else {
      data.stock -= jumlah;
    }

    data.transactions.push({
      id: t.id,
      tanggal: t.tanggal,
      tipe: t.tipe,
      jumlah: jumlah
    });
  });

  // 3. Tampilkan hasil
  console.log('📊 HASIL AUDIT PER CABANG:\n');

  const results: any[] = [];
  stockPerCabang.forEach((data, key) => {
    results.push({
      Produk: data.nama_produk,
      Cabang: data.nama_cabang,
      Stock: data.stock,
      'Total Transaksi': data.transactions.length,
      'Transaksi Invalid': data.invalid_transactions.length,
      Status: data.invalid_transactions.length > 0 ? '⚠️ MASALAH' : '✅ OK'
    });

    // Log detail jika ada masalah
    if (data.invalid_transactions.length > 0) {
      console.log(`\n⚠️ MASALAH DITEMUKAN: ${data.nama_produk} - ${data.nama_cabang}`);
      console.log('Invalid transactions:');
      console.table(data.invalid_transactions);
    }
  });

  console.table(results);

  // 4. Bandingkan dengan tabel produk
  console.log('\n🔍 Memverifikasi dengan tabel produk...\n');

  const produkMap = new Map();
  stockPerCabang.forEach((data, key) => {
    if (!produkMap.has(data.produk_id)) {
      produkMap.set(data.produk_id, {
        nama_produk: data.nama_produk,
        stock_calculated: 0
      });
    }
    produkMap.get(data.produk_id).stock_calculated += data.stock;
  });

  const verificationResults: any[] = [];
  for (const [produk_id, data] of produkMap.entries()) {
    const { data: produk } = await supabase
      .from('produk')
      .select('nama_produk, stok')
      .eq('id', produk_id)
      .single();

    const stockDB = parseFloat(produk?.stok?.toString() || '0');
    const selisih = Math.abs(stockDB - data.stock_calculated);

    verificationResults.push({
      Produk: data.nama_produk,
      'Stock di DB': stockDB,
      'Stock Calculated': data.stock_calculated,
      Selisih: selisih,
      Status: selisih < 0.01 ? '✅ KONSISTEN' : '❌ INKONSISTEN'
    });
  }

  console.table(verificationResults);

  // 5. Summary
  const inconsistent = verificationResults.filter(r => r.Status.includes('❌'));
  const hasInvalidTrans = results.filter(r => r.Status.includes('⚠️'));

  console.log('\n📊 SUMMARY:');
  console.log(`✅ Produk konsisten: ${verificationResults.length - inconsistent.length}`);
  console.log(`❌ Produk tidak konsisten: ${inconsistent.length}`);
  console.log(`⚠️ Cabang dengan transaksi invalid: ${hasInvalidTrans.length}`);

  if (inconsistent.length > 0 || hasInvalidTrans.length > 0) {
    console.log('\n🔧 REKOMENDASI:');
    if (hasInvalidTrans.length > 0) {
      console.log('1. Hapus atau perbaiki transaksi yang invalid');
      console.log('2. Pastikan semua transaksi punya tipe "masuk" atau "keluar"');
      console.log('3. Pastikan semua jumlah adalah angka valid');
    }
    if (inconsistent.length > 0) {
      console.log('4. Jalankan script fix-stock.ts untuk sinkronisasi');
    }
  }
}

// Jalankan audit
auditStockInconsistency().then(() => {
  console.log('\n✅ Audit selesai');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});