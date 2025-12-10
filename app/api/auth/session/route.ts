import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('user_session');
    
    console.log('=== SESSION CHECK ===');
    console.log('Cookie exists:', !!session);
    
    if (!session) {
      console.log('No session cookie found');
      return NextResponse.json({ success: false, user: null });
    }
    
    const user = JSON.parse(session.value);
    console.log('User from cookie:', user);
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        level: user.level,
        cabang_id: user.cabang_id
      }
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ 
      success: false, 
      user: null,
      error: 'Failed to parse session'
    });
  }
}