#!/usr/bin/env node

// ============================================
// CREATE SAMPLE USERS IN SUPABASE
// ============================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Creating sample users in Supabase...');

// Note: Adding some missing fields like nama, email, is_active
const users = [
  { username: 'admin', password: 'admin', level: 'super_admin', nama: 'Administrator', email: 'admin@example.com', is_active: false }, // soft deleted
  { username: 'akuntest', password: '123456', level: 'super_admin', nama: 'Test Account', email: 'test@example.com', is_active: true },
  { username: 'Ag', password: 'agse', level: 'sales', nama: 'Agent 1', email: 'ag@example.com', is_active: true },
  { username: 'akungudang', password: 'gudangkita', level: 'gudang', nama: 'Warehouse Manager', email: 'warehouse@example.com', is_active: true },
  { username: 'akunsales', password: 'gudangkita', level: 'sales', nama: 'Sales Manager', email: 'sales@example.com', is_active: true },
  { username: 'akunkasir', password: 'gudangkita', level: 'kasir', nama: 'Cashier', email: 'cashier@example.com', is_active: true },
  { username: 'akunkeuangan', password: 'gudangkita', level: 'keuangan', nama: 'Finance Manager', email: 'finance@example.com', is_active: true },
  { username: 'akuntumbal2', password: 'gudangkita', level: 'kasir', nama: 'Cashier Backup', email: 'cashier2@example.com', is_active: true }
];

async function createUsers() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  for (const user of users) {
    try {
      // Try insert first
      const result = await supabase
        .from('users')
        .insert(user);

      if (result.error) {
        console.log(`⚠️  Create failed ${user.username}:`, result.error.message);

        // Try upsert with username conflict
        const upsertResult = await supabase
          .from('users')
          .upsert(user, { onConflict: 'username' });

        if (upsertResult.error) {
          console.log(`❌ Upsert failed ${user.username}:`, upsertResult.error.message);
        } else {
          console.log(`✅ Upserted ${user.username}`);
        }
      } else {
        console.log(`✅ Created ${user.username}`);
      }
    } catch (err) {
      console.log(`💥 Error with ${user.username}:`, err.message);
    }
  }

  // Wait a bit then verify
  setTimeout(async () => {
    console.log('\n📋 Verifying users...');
    const { data, error } = await supabase
      .from('users')
      .select('username, level');

    if (error) {
      console.log('❌ Verification failed:', error.message);
    } else {
      console.log(`✅ Found ${data.length} users in database:`);
      data.forEach(user => console.log(`   ${user.username} (${user.level})`));

      console.log('\n🔐 READY-TO-LOGIN CREDENTIALS:');
      console.log('========================================');
      console.log('👨‍💼 Sales User: akunsales / gudangkita');
      console.log('🏭 Warehouse: akungudang / gudangkita');
      console.log('💰 Finance: akunkeuangan / gudangkita');
      console.log('🛍️ Cashier: akunkasir / gudangkita');
      console.log('👑 Super Admin: akuntest / 123456');
      console.log('========================================');
      console.log('\n🎯 Login with akunsales/gudangkita to test sales role!');
    }
  }, 2000);
}

createUsers().catch(console.error);
