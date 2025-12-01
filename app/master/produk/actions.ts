'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
};

export async function getProduk(): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    
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
}): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    
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
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding produk:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal menambahkan produk'
      };
    }

    revalidatePath('/master/produk');
    return { 
      success: true, 
      data,
      message: 'Produk berhasil ditambahkan'
    };
  } catch (error: any) {
    console.error('Exception in addProduk:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat menambahkan produk'
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
}): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .from('produk')
      .update({
        nama_produk: formData.nama_produk,
        harga: formData.harga || 0,
        hpp: formData.hpp || null,
        stok: formData.stok || 0,
        satuan: formData.satuan,
        is_jerigen: formData.is_jerigen || false,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating produk:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal mengupdate produk'
      };
    }

    revalidatePath('/master/produk');
    return { 
      success: true, 
      data,
      message: 'Produk berhasil diupdate'
    };
  } catch (error: any) {
    console.error('Exception in updateProduk:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat mengupdate produk'
    };
  }
}

export async function deleteProduk(id: number): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    
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
      return { 
        success: false, 
        error: 'Produk tidak dapat dihapus karena sudah digunakan dalam transaksi pembelian' 
      };
    }

    if (detailPenjualan && detailPenjualan.length > 0) {
      return { 
        success: false, 
        error: 'Produk tidak dapat dihapus karena sudah digunakan dalam transaksi penjualan' 
      };
    }

    const { error } = await supabase
      .from('produk')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting produk:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal menghapus produk'
      };
    }

    revalidatePath('/master/produk');
    return { 
      success: true,
      message: 'Produk berhasil dihapus'
    };
  } catch (error: any) {
    console.error('Exception in deleteProduk:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat menghapus produk'
    };
  }
}