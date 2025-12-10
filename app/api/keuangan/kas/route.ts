import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Ambil daftar kas
export async function GET(request: NextRequest) {
  try {
    const { data: kasData, error: kasError } = await supabase
      .from('kas')
      .select('*')
      .order('id', { ascending: true });

    if (kasError) {
      throw kasError;
    }

    return NextResponse.json({
      success: true,
      data: kasData || []
    });

  } catch (error: any) {
    console.error('Error fetching kas:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal mengambil data kas'
      },
      { status: 500 }
    );
  }
}
