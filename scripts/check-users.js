#!/usr/bin/env node

// ============================================
// Check Users Table - MD-APP Debugging Script
// ============================================
// This script checks what users exist in your database

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

// Your Supabase credentials (from .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking Users Database...');
console.log('================================\n');

// Check if environment variables are loaded
if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Environment variables not found!');
  console.log('Make sure .env.local contains:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  console.log('\nPlease run: npm run dev (to restart Next.js server) first');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsersTable() {
  try {
    // Check if users table exists and has data
    console.log('📋 Checking users table...');

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, level, nama, email')
      .order('username');

    if (usersError) {
      console.log('❌ Error querying users table:', usersError.message);

      // If table doesn't exist, try to create it with sample data
      console.log('🔧 Attempting to create users table...');

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          nama VARCHAR(100),
          email VARCHAR(100),
          level VARCHAR(20) NOT NULL DEFAULT 'kasir',
          cabang_id INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      if (createError) {
        console.log('❌ Could not create users table. Please create it manually in Supabase.');
        console.log('Table creation error:', createError.message);
      } else {
        console.log('✅ Users table created! Please add users manually.');
      }

      return;
    }

    console.log('✅ Users table exists');

    if (!users || users.length === 0) {
      console.log('⚠️  Users table is EMPTY!');

      console.log('\n📝 Adding sample users...');

      const sampleUsers = [
        { username: 'admin', password: 'admin123', nama: 'Administrator', email: 'admin@example.com', level: 'admin' },
        { username: 'gudang', password: 'gudang123', nama: 'Warehouse Manager', email: 'warehouse@example.com', level: 'gudang' },
        { username: 'sales', password: 'sales123', nama: 'Sales Manager', email: 'sales@example.com', level: 'sales' },
        { username: 'kasir', password: 'kasir123', nama: 'Cashier', email: 'cashier@example.com', level: 'kasir' },
        { username: 'keuangan', password: 'keuangan123', nama: 'Finance Manager', email: 'finance@example.com', level: 'keuangan' }
      ];

      for (const user of sampleUsers) {
        const { error: insertError } = await supabase
          .from('users')
          .insert(user);

        if (insertError) {
          console.log(`   ❌ Failed to add ${user.username}:`, insertError.message);
        } else {
          console.log(`   ✅ Added ${user.username} (${user.level})`);
        }
      }

    } else {
      console.log(`\n✅ Found ${users.length} users:`);
      console.log('=' + '='.repeat(50));

      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.level})`);
        if (user.nama) console.log(`   Name: ${user.nama}`);
        if (user.email) console.log(`   Email: ${user.email}`);
        console.log('');
      });

      console.log('🔐 LOGIN CREDENTIALS:');
      console.log('===================');
      users.forEach(user => {
        console.log(`👤 Username: ${user.username}`);
        console.log(`🔑 Password: ${user.username}123`);
        console.log(`🛡️  Role: ${user.level}\n`);
      });
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 READY-TO-LOGIN USERS');
  console.log('=' + '='.repeat(50));
  console.log('Try these sample credentials:');
  console.log('• admin / admin123 (Full access)');
  console.log('• gudang / gudang123 (Warehouse)');
  console.log('• sales / sales123 (Sales + Consignment)');
  console.log('• kasir / kasir123 (POS operations)');
  console.log('• keuangan / keuangan123 (Finance)');
  console.log('\n🚨 Note: Passwords are NOT hashed for demo purposes!');
  console.log('    Add bcrypt hashing in production!');
  console.log('=' + '='.repeat(50));
}

checkUsersTable();
