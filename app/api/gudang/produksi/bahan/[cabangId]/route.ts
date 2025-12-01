import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest, 
  context: { params: Promise<{ cabangId: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { cabangId } = await context.params; // AWAIT params

    console.log('Fetching bahan for cabang:', cabangId);

    // Call the RPC function
    const { data, error } = await supabase
      .rpc('get_bahan_cabang', { 
        cabang_id_input: parseInt(cabangId) 
      });

    if (error) {
      console.error('Supabase RPC error:', error);
      throw error;
    }

    console.log('RPC result:', data);

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Error fetching bahan by cabang:', error);
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}