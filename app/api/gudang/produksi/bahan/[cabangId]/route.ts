import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cabangId: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { cabangId } = await context.params; // AWAIT params

    console.log('Fetching bahan for cabang:', cabangId);

    // Step 1: Cari produk yang ada di stock_barang untuk cabang ini
    const { data: stockData, error: stockError } = await supabase
      .from('stock_barang')
      .select('produk_id')
      .eq('cabang_id', parseInt(cabangId))
      .gt('jumlah', 0);

    if (stockError) {
      console.error('Error fetching stock data for cabang:', stockError);
      throw stockError;
    }

    // Jika tidak ada produk di cabang ini
    if (!stockData || stockData.length === 0) {
      console.log('No products found in stock for cabang:', cabangId);
      return NextResponse.json({ data: [] });
    }

    // Extract produk IDs
    const produkIds = [...new Set(stockData.map(item => item.produk_id))];
    console.log('Found produk IDs in cabang:', produkIds);

    // Step 2: Ambil produk detail dari master produk yang memiliki stock > 0
    const { data, error } = await supabase
      .from('produk')
      .select('id, nama_produk, kode_produk, satuan, stok, hpp')
      .in('id', produkIds) // Hanya produk yang ada di cabang ini
      .gt('stok', 0) // Hanya yang masih ada stock
      .not('nama_produk', 'is', null)
      .order('nama_produk');

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Raw produk table result:', data);

    // Transform ke format yang diperlukan modal
    const bahan = data?.map((produk: any) => ({
      produk_id: produk.id,
      nama_produk: produk.nama_produk,
      stok: produk.stok, // Gunakan stock dari master produk table
      satuan: produk.satuan || 'pcs',
      hpp: produk.hpp || 0
    })) || [];

    console.log('Transformed bahan data to match modal format:', bahan);

    return NextResponse.json({ data: bahan });
  } catch (error: any) {
    console.error('Error fetching bahan by cabang:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
