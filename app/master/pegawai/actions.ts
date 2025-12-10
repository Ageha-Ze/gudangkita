'use server';

import { supabaseAuthenticated } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// Define return types for consistency
type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  warning?: string;
  data?: any;
};

export async function getPegawai(): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();
    
    const { data, error } = await supabase
      .from('pegawai')
      .select(`
        *,
        cabang:cabang_id (
          id,
          kode_cabang,
          nama_cabang
        ),
        user:user_id (
          id,
          username
        )
      `)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching pegawai:', error);
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
    console.error('Unexpected error in getPegawai:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Unknown error'
    };
  }
}

export async function getCabangList(): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();
    
    const { data, error } = await supabase
      .from('cabang')
      .select('id, kode_cabang, nama_cabang')
      .order('kode_cabang', { ascending: true });

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

export async function getUserList(): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();
    
    const { data, error } = await supabase
      .from('users')
      .select('id, username')
      .order('username', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
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
    console.error('Unexpected error in getUserList:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Unknown error'
    };
  }
}

export async function addPegawai(formData: any): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();
    
    const { data, error } = await supabase
      .from('pegawai')
      .insert([formData])
      .select()
      .single();

    if (error) {
      console.error('Error adding pegawai:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal menambahkan pegawai'
      };
    }

    revalidatePath('/master/pegawai');
    return { 
      success: true,
      data,
      message: 'Pegawai berhasil ditambahkan'
    };
  } catch (error: any) {
    console.error('Unexpected error in addPegawai:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat menambahkan pegawai'
    };
  }
}

export async function updatePegawai(id: number, formData: any): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();
    
    const { data, error } = await supabase
      .from('pegawai')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pegawai:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal mengupdate pegawai'
      };
    }

    revalidatePath('/master/pegawai');
    return { 
      success: true,
      data,
      message: 'Pegawai berhasil diupdate'
    };
  } catch (error: any) {
    console.error('Unexpected error in updatePegawai:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat mengupdate pegawai'
    };
  }
}

export async function deletePegawai(id: number): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();
    
    const { error } = await supabase
      .from('pegawai')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pegawai:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Gagal menghapus pegawai'
      };
    }

    revalidatePath('/master/pegawai');
    return { 
      success: true,
      message: 'Pegawai berhasil dihapus'
    };
  } catch (error: any) {
    console.error('Unexpected error in deletePegawai:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat menghapus pegawai'
    };
  }
}