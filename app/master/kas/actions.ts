'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// Define return types for consistency
type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  warning?: string;
  data?: any;
};


export async function getKas(): Promise<ActionResult> {
  try {
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from('kas')
      .select(`
        *,
        cabang:cabang_id (
          id,
          nama_cabang
        )
      `)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching kas:', error);
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
    console.error('Unexpected error in getKas:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Unknown error'
    };
  }
}

export async function getCabangList(): Promise<ActionResult> {
  try {
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from('cabang')
      .select('id, nama_cabang')
      .order('nama_cabang', { ascending: true });

    if (error) {
      console.error('Error fetching cabang:', error);
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
    console.error('Unexpected error in getCabangList:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Unknown error'
    };
  }
}

export async function getTransaksiKas(kasId: number): Promise<ActionResult> {
  try {
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from('transaksi_kas')
      .select('*')
      .eq('kas_id', kasId)
      .order('tanggal_transaksi', { ascending: false });

    if (error) {
      console.error('Error fetching transaksi kas:', error);
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
    console.error('Unexpected error in getTransaksiKas:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Unknown error'
    };
  }
}

export async function addKas(formData: any): Promise<ActionResult> {
  try {
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from('kas')
      .insert([formData])
      .select()
      .single();

    if (error) {
      console.error('Error adding kas:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal menambahkan kas'
      };
    }

    revalidatePath('/master/kas');
    return { 
      success: true,
      data,
      message: 'Kas berhasil ditambahkan'
    };
  } catch (error: any) {
    console.error('Unexpected error in addKas:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat menambahkan kas'
    };
  }
}

export async function updateKas(id: number, formData: any): Promise<ActionResult> {
  try {
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from('kas')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating kas:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal mengupdate kas'
      };
    }

    revalidatePath('/master/kas');
    return { 
      success: true,
      data,
      message: 'Kas berhasil diupdate'
    };
  } catch (error: any) {
    console.error('Unexpected error in updateKas:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat mengupdate kas'
    };
  }
}

export async function deleteKas(id: number): Promise<ActionResult> {
  try {
    const supabase = supabaseServer();
    
    const { error } = await supabase
      .from('kas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting kas:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal menghapus kas'
      };
    }

    revalidatePath('/master/kas');
    return { 
      success: true,
      message: 'Kas berhasil dihapus'
    };
  } catch (error: any) {
    console.error('Unexpected error in deleteKas:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat menghapus kas'
    };
  }
}