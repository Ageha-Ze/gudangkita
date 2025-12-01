     // app/api/gudang/produksi/[id]/route.ts

     'use server';

     import { NextRequest, NextResponse } from 'next/server';
     import { supabaseServer } from '@/lib/supabaseServer';

     export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
       try {
         const supabase = await supabaseServer();
         const { id } = await params;

         console.log('Fetching produksi detail for ID:', id);

         // Call the RPC function
         const { data, error } = await supabase.rpc('get_produksi_with_details', { produksi_id: parseInt(id) });

         if (error) {
           console.error('Supabase RPC error:', error);
           throw error;
         }

         if (!data) {
           throw new Error('No data returned from RPC');
         }

         console.log('Fetched data:', JSON.stringify(data, null, 2));

         return NextResponse.json({ data });
       } catch (error: any) {
         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
         console.error('Error fetching produksi detail:', errorMessage);
         return NextResponse.json({ error: errorMessage }, { status: 500 });
       }
     }


export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();
    const { item_id, jumlah, hpp, subtotal } = body;

    if (!item_id || !jumlah || !hpp || !subtotal) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 });
    }

    // Fix: Await params and destructure id
    const { id } = await params;

    const { data, error } = await supabase
      .from('detail_produksi')
      .insert({
        produksi_id: parseInt(id),  // Use the awaited id
        item_id: parseInt(item_id),
        jumlah: parseFloat(jumlah),
        hpp: parseFloat(hpp),
        subtotal: parseFloat(subtotal),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error adding detail:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    const detailId = searchParams.get('detailId');
    const { id } = await params;

    if (detailId) {
      // Delete a specific detail item (existing logic)
      const { error } = await supabase
        .from('detail_produksi')
        .delete()
        .eq('id', parseInt(detailId));

      if (error) throw error;
      return NextResponse.json({ message: 'Detail deleted' });
    } else {
      // Cancel the entire production: Delete all details first, then the production
      const produksiId = parseInt(id);

      // Step 1: Delete all related detail_produksi (to avoid FK constraint errors)
      const { error: deleteDetailsError } = await supabase
        .from('detail_produksi')
        .delete()
        .eq('produksi_id', produksiId);

      if (deleteDetailsError) throw deleteDetailsError;

      // Step 2: Delete the production record
      const { error: deleteProduksiError } = await supabase
        .from('transaksi_produksi')  // Your table name
        .delete()
        .eq('id', produksiId);

      if (deleteProduksiError) throw deleteProduksiError;

      return NextResponse.json({ message: 'Production canceled and deleted' });
    }
  } catch (error: any) {
    console.error('Error in DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}