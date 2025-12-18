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

// Definisi UserLevel sesuai dengan enum di database
type UserLevel = 'super_admin' | 'admin' | 'keuangan' | 'kasir' | 'gudang' | 'sales';

// Fungsi validasi level
function isValidUserLevel(level: string): level is UserLevel {
  return ['super_admin', 'admin', 'keuangan', 'kasir', 'gudang', 'sales'].includes(level);
}

export async function getUsers(): Promise<any[]> {
  try {
    const supabase = await supabaseAuthenticated();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Unexpected error in getUsers:', error);
    return [];
  }
}

export async function addUser(formData: {
  username: string;
  password: string;
  level: string;
}): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    // Validasi input
    if (!formData.username || !formData.password) {
      throw new Error('Username dan password harus diisi');
    }

    // Validasi level
    if (!isValidUserLevel(formData.level)) {
      throw new Error(`Level tidak valid. Pilih salah satu: super_admin, admin, keuangan, kasir, gudang, sales`);
    }

    const { data, error } = await supabase
      .from('users')
      .insert([formData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }, 'Create User');

  if (result.success) {
    revalidatePath('/master/user');
    return {
      success: true,
      data: result.data,
      message: 'User berhasil ditambahkan',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error adding user:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal menambahkan user',
      isOffline: true,
      queued: true
    };
  }
}

export async function updateUser(
  id: number,
  formData: {
    username: string;
    password?: string;
    level: string;
  }
): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    // Validasi input
    if (!formData.username) {
      throw new Error('Username harus diisi');
    }

    // Validasi level
    if (!isValidUserLevel(formData.level)) {
      throw new Error(`Level tidak valid. Pilih salah satu: super_admin, admin, keuangan, kasir, gudang, sales`);
    }

    const updateData: any = {
      username: formData.username,
      level: formData.level,
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, 'Update User');

  if (result.success) {
    revalidatePath('/master/user');
    return {
      success: true,
      data: result.data,
      message: 'User berhasil diupdate',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error updating user:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal mengupdate user',
      isOffline: true,
      queued: true
    };
  }
}

export async function deleteUser(id: number): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    // Optional: Check if user is being used in other tables
    // Add your business logic here if needed

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }, 'Delete User');

  if (result.success) {
    revalidatePath('/master/user');
    return {
      success: true,
      message: 'User berhasil dihapus',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error deleting user:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal menghapus user',
      isOffline: true,
      queued: true
    };
  }
}
