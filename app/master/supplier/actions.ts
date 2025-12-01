'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
};

export async function getSuplier(): Promise<any[]> {
  try {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .from('suplier')
      .select(`
        *,
        cabang:cabang_id (
          id,
          nama_cabang
        )
      `)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching suplier:', error);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Unexpected error in getSuplier:', error);
    return [];
  }
}

export async function getCabangList(): Promise<Array<{ id: number; nama_cabang: string }>> {
  try {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .from('cabang')
      .select('id, nama_cabang')
      .order('nama_cabang', { ascending: true });

    if (error) {
      console.error('Error fetching cabang:', error);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Unexpected error in getCabangList:', error);
    return [];
  }
}

export async function addSuplier(formData: {
  cabang_id: number;
  nama: string;
  alamat: string;
  no_telp: string;
  email: string;
  website: string;
  no_rekening: string;
  nama_bank: string;
  daerah_operasi: string;
  tanggal_order_terakhir: string;
}): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    
    // Validasi input
    if (!formData.nama || !formData.cabang_id) {
      return {
        success: false,
        error: 'Nama suplier dan cabang harus diisi',
        message: 'Data tidak lengkap'
      };
    }

    const { data, error } = await supabase
      .from('suplier')
      .insert([formData])
      .select()
      .single();

    if (error) {
      console.error('Error adding suplier:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal menambahkan suplier'
      };
    }

    revalidatePath('/master/suplier');
    return { 
      success: true,
      data,
      message: 'Suplier berhasil ditambahkan'
    };
  } catch (error: any) {
    console.error('Exception in addSuplier:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat menambahkan suplier'
    };
  }
}

export async function updateSuplier(
  id: number,
  formData: {
    cabang_id: number;
    nama: string;
    alamat: string;
    no_telp: string;
    email: string;
    website: string;
    no_rekening: string;
    nama_bank: string;
    daerah_operasi: string;
    tanggal_order_terakhir: string;
  }
): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    
    // Validasi input
    if (!formData.nama || !formData.cabang_id) {
      return {
        success: false,
        error: 'Nama suplier dan cabang harus diisi',
        message: 'Data tidak lengkap'
      };
    }

    const { data, error } = await supabase
      .from('suplier')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating suplier:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal mengupdate suplier'
      };
    }

    revalidatePath('/master/suplier');
    return { 
      success: true,
      data,
      message: 'Suplier berhasil diupdate'
    };
  } catch (error: any) {
    console.error('Exception in updateSuplier:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat mengupdate suplier'
    };
  }
}

export async function deleteSuplier(id: number): Promise<ActionResult> {
  try {
    const supabase = await supabaseServer();
    
    // Cek apakah suplier digunakan di transaksi pembelian
    const { data: pembelianData } = await supabase
      .from('pembelian')
      .select('id')
      .eq('suplier_id', id)
      .limit(1);

    if (pembelianData && pembelianData.length > 0) {
      return { 
        success: false, 
        error: 'Suplier tidak dapat dihapus karena sudah digunakan dalam transaksi pembelian',
        message: 'Tidak dapat menghapus suplier'
      };
    }

    const { error } = await supabase
      .from('suplier')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting suplier:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal menghapus suplier'
      };
    }

    revalidatePath('/master/suplier');
    return { 
      success: true,
      message: 'Suplier berhasil dihapus'
    };
  } catch (error: any) {
    console.error('Exception in deleteSuplier:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat menghapus suplier'
    };
  }
}