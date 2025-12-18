'use server';

import { supabaseAuthenticated } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { databaseOperationWithRetry } from '@/lib/apiRetry';

type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  isOffline?: boolean;
  queued?: boolean;
};

export async function getProduk(): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();
    
    const { data, error } = await supabase
      .from('produk')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching produk:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error: any) {
    console.error('Unexpected error in getProduk:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Unknown error'
    };
  }
}

export async function addProduk(formData: {
  kode_produk?: string | null;
  nama_produk: string;
  harga: number;
  hpp?: number | null;
  stok: number;
  satuan: string;
  is_jerigen: boolean;
  density_kg_per_liter?: number; // 🆕
  allow_manual_conversion?: boolean; // 🆕
}): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    // Jika kode_produk tidak diisi, generate otomatis
    let kodeProduk = formData.kode_produk;

    if (!kodeProduk) {
      // Generate dari nama produk
      const prefix = formData.nama_produk
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 3)
        .padEnd(3, 'X');

      const timestamp = Date.now().toString().slice(-4);
      kodeProduk = `${prefix}${timestamp}`;
    }

    const { data, error } = await supabase
      .from('produk')
      .insert([{
        kode_produk: kodeProduk,
        nama_produk: formData.nama_produk,
        harga: formData.harga || 0,
        hpp: formData.hpp || null,
        stok: formData.stok || 0,
        satuan: formData.satuan,
        is_jerigen: formData.is_jerigen || false,
        density_kg_per_liter: formData.density_kg_per_liter || 1.0, // 🆕
        allow_manual_conversion: formData.allow_manual_conversion || false, // 🆕
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }, 'Create Produk');

  if (result.success) {
    revalidatePath('/master/produk');
    return {
      success: true,
      data: result.data,
      message: 'Produk berhasil ditambahkan',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error adding produk:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal menambahkan produk',
      isOffline: true,
      queued: true
    };
  }
}

export async function updateProduk(id: number, formData: {
  kode_produk?: string | null;
  nama_produk: string;
  harga: number;
  hpp?: number | null;
  stok: number;
  satuan: string;
  is_jerigen: boolean;
  density_kg_per_liter?: number; // 🆕
  allow_manual_conversion?: boolean; // 🆕
}): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    const { data, error } = await supabase
      .from('produk')
      .update({
        nama_produk: formData.nama_produk,
        harga: formData.harga || 0,
        hpp: formData.hpp || null,
        stok: formData.stok || 0,
        satuan: formData.satuan,
        is_jerigen: formData.is_jerigen || false,
        density_kg_per_liter: formData.density_kg_per_liter || 1.0, // 🆕
        allow_manual_conversion: formData.allow_manual_conversion || false, // 🆕
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, 'Update Produk');

  if (result.success) {
    revalidatePath('/master/produk');
    return {
      success: true,
      data: result.data,
      message: 'Produk berhasil diupdate',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error updating produk:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal mengupdate produk',
      isOffline: true,
      queued: true
    };
  }
}

export async function deleteProduk(id: number): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    // Cek apakah produk digunakan di transaksi
    const { data: detailPembelian } = await supabase
      .from('detail_pembelian')
      .select('id')
      .eq('produk_id', id)
      .limit(1);

    const { data: detailPenjualan } = await supabase
      .from('detail_penjualan')
      .select('id')
      .eq('produk_id', id)
      .limit(1);

    if (detailPembelian && detailPembelian.length > 0) {
      throw new Error('Produk tidak dapat dihapus karena sudah digunakan dalam transaksi pembelian');
    }

    if (detailPenjualan && detailPenjualan.length > 0) {
      throw new Error('Produk tidak dapat dihapus karena sudah digunakan dalam transaksi penjualan');
    }

    const { error } = await supabase
      .from('produk')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }, 'Delete Produk');

  if (result.success) {
    revalidatePath('/master/produk');
    return {
      success: true,
      message: 'Produk berhasil dihapus',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error deleting produk:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal menghapus produk',
      isOffline: true,
      queued: true
    };
  }
}
