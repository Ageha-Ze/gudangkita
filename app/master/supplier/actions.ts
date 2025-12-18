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

export async function getSuplier(): Promise<any[]> {
  try {
    const supabase = await supabaseAuthenticated();
    
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
    const supabase = await supabaseAuthenticated();
    
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
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    // Validasi input
    if (!formData.nama || !formData.cabang_id) {
      throw new Error('Nama suplier dan cabang harus diisi');
    }

    const { data, error } = await supabase
      .from('suplier')
      .insert([formData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }, 'Create Supplier');

  if (result.success) {
    revalidatePath('/master/suplier');
    return {
      success: true,
      data: result.data,
      message: 'Suplier berhasil ditambahkan',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error adding suplier:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal menambahkan suplier',
      isOffline: true,
      queued: true
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
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    // Validasi input
    if (!formData.nama || !formData.cabang_id) {
      throw new Error('Nama suplier dan cabang harus diisi');
    }

    const { data, error } = await supabase
      .from('suplier')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, 'Update Supplier');

  if (result.success) {
    revalidatePath('/master/suplier');
    return {
      success: true,
      data: result.data,
      message: 'Suplier berhasil diupdate',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error updating suplier:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal mengupdate suplier',
      isOffline: true,
      queued: true
    };
  }
}

export async function deleteSuplier(id: number): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    // Cek apakah suplier digunakan di transaksi pembelian
    const { data: pembelianData } = await supabase
      .from('pembelian')
      .select('id')
      .eq('suplier_id', id)
      .limit(1);

    if (pembelianData && pembelianData.length > 0) {
      throw new Error('Suplier tidak dapat dihapus karena sudah digunakan dalam transaksi pembelian');
    }

    const { error } = await supabase
      .from('suplier')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }, 'Delete Supplier');

  if (result.success) {
    revalidatePath('/master/suplier');
    return {
      success: true,
      message: 'Suplier berhasil dihapus',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error deleting suplier:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal menghapus suplier',
      isOffline: true,
      queued: true
    };
  }
}
