import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();

    // Get unique cabangs that have stock data
    const { data: cabangData, error } = await supabase
      .from('stock_barang')
      .select(`
        cabang_id,
        cabang:cabang_id (
          id,
          nama_cabang,
          kode_cabang
        )
      `)
      .not('cabang', 'is', null)
      .order('cabang_id');

    if (error) {
      console.error('Error fetching cabang list:', error);
      return NextResponse.json({ error: 'Failed to fetch cabang list' }, { status: 500 });
    }

    // Remove duplicates and filter out null values
    const uniqueCabangs = cabangData
      ?.filter((item: any) => item.cabang !== null)
      .reduce((acc: any[], item: any) => {
        const existing = acc.find((c: any) => c.id === item.cabang.id);
        if (!existing) {
          acc.push(item.cabang);
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => a.nama_cabang.localeCompare(b.nama_cabang));

    return NextResponse.json({
      success: true,
      data: uniqueCabangs || []
    });

  } catch (error: any) {
    console.error('Unexpected error in cabang-list:', error);
    return NextResponse.json({
      error: error.message || 'Unexpected error occurred',
      stack: error.stack
    }, { status: 500 });
  }
}
