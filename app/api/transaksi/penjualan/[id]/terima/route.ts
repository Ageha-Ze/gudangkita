'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;
    const body = await request.json();

    console.log('✅ Konfirmasi penerimaan:', id, body);

    // Update status_diterima
    const { error } = await supabase
      .from('transaksi_penjualan')
      .update({
        status_diterima: 'Diterima',
        tanggal_diterima: body.tanggal_diterima,
        diterima_oleh: body.diterima_oleh,
        catatan_penerimaan: body.catatan || null,
      })
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Status diterima updated');

    return NextResponse.json({
      success: true,
      message: 'Penerimaan barang berhasil dikonfirmasi',
    });
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}