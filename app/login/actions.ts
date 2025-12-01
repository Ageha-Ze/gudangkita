'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function loginUser(username: string, password: string) {
  try {
    console.log('=== LOGIN START ===');
    console.log('Username:', username);
    
    const supabase = supabaseServer();
    console.log('Supabase client created');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    console.log('Query result:', { data, error });

    if (error || !data) {
      console.log('Login failed:', error);
      return { success: false, error: 'Username atau password salah' };
    }

    console.log('User found:', data.username);

    const cookieStore = await cookies();
    cookieStore.set('user_session', JSON.stringify(data), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    console.log('=== LOGIN SUCCESS ===');
    return { success: true, user: data };
  } catch (error) {
    console.error('=== LOGIN ERROR ===', error);
    return { success: false, error: 'Terjadi kesalahan sistem' };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('user_session');
  return { success: true };
}

export async function getUserSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  
  if (!session) return null;
  
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}