'use server';

import { supabaseAuthenticated } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function loginUser(username: string, password: string) {
  try {
    console.log('=== LOGIN START ===');
    console.log('Username:', username);
    console.log('Password length:', password.length);

    // For login, bypass authentication check since we don't have a session yet
    const supabase = await supabaseAuthenticated(false);
    console.log('Supabase client created');

    // First check if the users table exists and has data
    const { data: allUsers, error: tableError } = await supabase
      .from('users')
      .select('username')
      .limit(5);

    console.log('Users table check:', { availableUsers: allUsers, tableError });

    // First try to find user by username only
    const { data: userByUsername, error: usernameError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    console.log('Username lookup:', {
      username,
      found: !!userByUsername,
      user: userByUsername ? { id: userByUsername.id, level: userByUsername.level, hasDeletedAt: !!userByUsername.deleted_at } : null,
      error: usernameError
    });

    if (usernameError || !userByUsername) {
      console.log('User not found');
      return { success: false, error: 'Username atau password salah' };
    }

    // Check if user is soft deleted
    if (userByUsername.deleted_at) {
      console.log('User is soft deleted');
      return { success: false, error: 'Username atau password salah' };
    }

    // Check password match
    const isPasswordCorrect = userByUsername.password === password;
    console.log('Password check:', {
      providedLength: password.length,
      storedPassword: userByUsername.password,
      match: isPasswordCorrect
    });

    if (!isPasswordCorrect) {
      console.log('Password mismatch');
      return { success: false, error: 'Username atau password salah' };
    }

    const data = userByUsername;

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
