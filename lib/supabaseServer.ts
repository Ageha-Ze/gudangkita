import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface UserSession {
  id: string;
  username: string;
  level: string;
}

/**
 * MAIN FUNCTION: Use this for all authenticated operations
 * Sets user context for RLS to work properly
 */
export async function supabaseAuthenticated(requireAuth: boolean = true) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    throw new Error('Missing Supabase environment variables');
  }

  // Create client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // If auth required, set user context
  if (requireAuth) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    if (!sessionCookie) {
      throw new Error('Authentication required. Please log in.');
    }

    let userSession: UserSession;
    try {
      userSession = JSON.parse(sessionCookie.value);
      if (!userSession || !userSession.id) {
        throw new Error('Invalid user session');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Authentication check failed: ${errorMessage}`);
    }

    // Set user context for RLS
    try {
      const { error: rpcError } = await supabase.rpc('set_user_context', { 
        user_id: userSession.id 
      });
      
      if (rpcError) {
        console.error('❌ Failed to set user context:', rpcError);
      } else {
        console.log('✅ User context set for RLS:', userSession.id);
      }
    } catch (error) {
      console.error('❌ Exception setting user context:', error);
      // Continue anyway - some operations might still work
    }
  }

  return supabase;
}

/**
 * LEGACY: Service role without context (bypasses RLS)
 * Only use for admin operations or when RLS is not needed
 */
export const supabaseService = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Deprecated
export const supabaseServer = () => {
  console.warn('⚠️ WARNING: supabaseServer() bypasses RLS! Use supabaseAuthenticated() instead.');
  return supabaseService();
};