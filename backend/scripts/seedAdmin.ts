import { supabaseAdmin } from '../lib/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

const adminEmail = 'dcon@admin.com';
const adminPassword = 'admindcon1232';

async function seedAdmin() {
  try {
    console.log('Starting admin seeding...');

    // 1. Create the admin user via Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('Admin user already exists, updating password...');
        const { data: existingUsers } = await (supabaseAdmin.auth.admin as any).listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === adminEmail);
        const userId = existingUser?.id;
        if (!userId) {
          throw new Error(`Could not find existing admin user ID for ${adminEmail}`);
        }
        await (supabaseAdmin.auth.admin as any).updateUserById(userId, { password: adminPassword });
        console.log('Admin password refreshed for existing user.');
      } else {
        throw authError;
      }
    } else {
      console.log('Admin user created via auth:', authUser.user?.id);
    }

    // 2. Insert/update admin profile in users table
    const { data: existingAdmin } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (!existingAdmin && authUser?.user?.id) {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.user.id,
          email: adminEmail,
          role: 'admin',
          can_login: true,
          approved: true,
          full_name: 'DCONS Administrator',
        });

      if (insertError) {
        console.error('Error inserting admin user:', insertError);
        throw insertError;
      }

      console.log('✅ Admin user created successfully!');
    } else if (existingAdmin) {
      console.log('✅ Admin user already exists');
    }

    console.log('\n=== Master Admin Credentials ===');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('================================\n');

  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
