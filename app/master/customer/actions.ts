// ============================================
// 1. CUSTOMER ACTIONS (app/master/customer/actions.ts)
// ============================================
'use server';

import { supabaseAuthenticated } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { CustomerFormData } from '@/types/customer';
import { databaseOperationWithRetry } from '@/lib/apiRetry';

type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  isOffline?: boolean;
  queued?: boolean;
};

// Generate kode customer otomatis
async function generateKodeCustomer(): Promise<string> {
  try {
    const supabase = await supabaseAuthenticated();

    const { data, error } = await supabase
      .from('customer')
      .select('kode_customer, id')
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error generating kode:', error);
      return `CUST-${Date.now()}`;
    }

    if (!data || data.length === 0) {
      return '1';
    }

    const lastKode = data[0].kode_customer;

    // Handle NaN or invalid kode_customer
    if (!lastKode || lastKode === 'NaN' || isNaN(parseInt(lastKode))) {
      // If code is NaN or non-numeric, use timestamp-based generation
      return `CUST-${Date.now()}`;
    }

    // If code is already a CUST-timestamp format, generate a new timestamp
    if (lastKode.startsWith('CUST-')) {
      return `CUST-${Date.now()}`;
    }

    // For numeric codes, increment
    const lastKodeNum = parseInt(lastKode);
    if (isNaN(lastKodeNum)) {
      // Fallback to timestamp if parsing fails
      return `CUST-${Date.now()}`;
    }

    return (lastKodeNum + 1).toString();
  } catch (error) {
    console.error('Exception in generateKodeCustomer:', error);
    return `CUST-${Date.now()}`;
  }
}

// Get all customers dengan relasi cabang
export async function getCustomers(): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();

    const { data, error } = await supabase
      .from('customer')
      .select(`
        id,
        kode_customer,
        nama,
        alamat,
        no_hp,
        cabang_id,
        created_at,
        updated_at,
        cabang:cabang!customer_cabang_id_fkey (
          id,
          nama_cabang
        )
      `)
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return {
        success: false,
        error: error.message,
        message: 'Gagal mengambil data customer'
      };
    }

    // Transform cabang dari array menjadi objek tunggal
    const transformedData = data?.map(customer => ({
      ...customer,
      cabang: Array.isArray(customer.cabang) && customer.cabang.length > 0 
        ? customer.cabang[0] 
        : null
    })) || [];

    return {
      success: true,
      data: transformedData
    };
  } catch (error: any) {
    console.error('Unexpected error in getCustomers:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat mengambil data customer'
    };
  }
}

// Get single customer by ID
export async function getCustomerById(id: number): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();

    const { data, error } = await supabase
      .from('customer')
      .select(`
        *,
        cabang:cabang_id (
          id,
          nama_cabang
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching customer:', error);
      return {
        success: false,
        error: error.message,
        message: 'Gagal mengambil data customer'
      };
    }

    // Transform cabang dari array menjadi objek tunggal
    const transformedData = {
      ...data,
      cabang: Array.isArray(data.cabang) && data.cabang.length > 0 
        ? data.cabang[0] 
        : null
    };

    return {
      success: true,
      data: transformedData
    };
  } catch (error: any) {
    console.error('Unexpected error in getCustomerById:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Terjadi kesalahan saat mengambil data customer'
    };
  }
}

// Create new customer
export async function createCustomer(formData: CustomerFormData): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    // Generate kode customer jika tidak ada
    const kodeCustomer = formData.kode_customer || await generateKodeCustomer();

    const { data, error } = await supabase
      .from('customer')
      .insert({
        kode_customer: kodeCustomer,
        nama: formData.nama,
        alamat: formData.alamat || null,
        no_hp: formData.no_hp || null,
        cabang_id: formData.cabang_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, 'Create Customer');

  if (result.success) {
    revalidatePath('/master/customer');
    return {
      success: true,
      data: result.data,
      message: 'Customer berhasil ditambahkan',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error creating customer:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal menambahkan customer',
      isOffline: true,
      queued: true
    };
  }
}

// Update customer
export async function updateCustomer(id: number, formData: CustomerFormData): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    const { data, error } = await supabase
      .from('customer')
      .update({
        nama: formData.nama,
        alamat: formData.alamat || null,
        no_hp: formData.no_hp || null,
        cabang_id: formData.cabang_id || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, 'Update Customer');

  if (result.success) {
    revalidatePath('/master/customer');
    return {
      success: true,
      data: result.data,
      message: 'Customer berhasil diupdate',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error updating customer:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal mengupdate customer',
      isOffline: true,
      queued: true
    };
  }
}

// Delete customer
export async function deleteCustomer(id: number): Promise<ActionResult> {
  const result = await databaseOperationWithRetry(async () => {
    const supabase = await supabaseAuthenticated();

    const { error } = await supabase
      .from('customer')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }, 'Delete Customer');

  if (result.success) {
    revalidatePath('/master/customer');
    return {
      success: true,
      message: 'Customer berhasil dihapus',
      isOffline: result.isRetry,
      queued: result.isRetry
    };
  } else {
    console.error('Error deleting customer:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Gagal menghapus customer',
      isOffline: true,
      queued: true
    };
  }
}

// Get all cabang for dropdown
export async function getCabangList(): Promise<ActionResult> {
  try {
    const supabase = await supabaseAuthenticated();

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
