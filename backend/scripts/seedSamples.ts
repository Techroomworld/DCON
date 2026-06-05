import { supabaseAdmin } from '../lib/supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

// Sample teacher account
const teacherEmail = 'teacher@dcons.local';
const teacherPassword = 'Teacher@Dcons123';
const teacherName = 'Prof. James Smith';

// Sample student accounts
const students = [
  { email: 'student1@dcons.local', password: 'Student@Dcons123', name: 'Alice Johnson' },
  { email: 'student2@dcons.local', password: 'Student@Dcons123', name: 'Bob Wilson' },
  { email: 'student3@dcons.local', password: 'Student@Dcons123', name: 'Charlie Davis' },
];

async function createOrGetUser(email: string, password: string, role: string, fullName: string) {
  try {
    // Try to create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    let userId: string;
    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log(`User ${email} already exists in auth`);
        // Get the user ID from existing user
        const { data: existingUsers } = await (supabaseAdmin.auth.admin as any).listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
        userId = existingUser?.id;
        if (!userId) {
          console.error(`Could not find user ID for ${email}`);
          return;
        }
      } else {
        throw authError;
      }
    } else {
      userId = authUser.user?.id;
      if (!userId) {
        console.error(`No user ID returned for ${email}`);
        return;
      }
    }

    // Check if user profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!existingProfile) {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email,
          role: role,
          can_login: true,
          approved: role === 'teacher' ? true : false, // Teachers auto-approved, students need approval
          full_name: fullName,
        });

      if (insertError) {
        console.error(`Error creating profile for ${email}:`, insertError);
      } else {
        console.log(`✅ ${role} created: ${email}`);
      }
    } else {
      console.log(`✅ ${role} already exists: ${email}`);
    }
  } catch (error) {
    console.error(`Error processing ${email}:`, error);
  }
}

async function seedSamples() {
  try {
    console.log('Seeding sample users...\n');

    // Create teacher
    await createOrGetUser(teacherEmail, teacherPassword, 'teacher', teacherName);

    // Create students
    for (const student of students) {
      await createOrGetUser(student.email, student.password, 'student', student.name);
    }

    console.log('\n=== Sample Login Credentials ===');
    console.log('\n📚 TEACHER ACCOUNT:');
    console.log(`   Email: ${teacherEmail}`);
    console.log(`   Password: ${teacherPassword}`);
    console.log(`   Name: ${teacherName}`);

    console.log('\n👤 STUDENT ACCOUNTS (need teacher approval):');
    students.forEach((student, i) => {
      console.log(`   ${i + 1}. Email: ${student.email}`);
      console.log(`      Password: ${student.password}`);
      console.log(`      Name: ${student.name}`);
    });

    console.log('\n🔐 ADMIN ACCOUNT:');
    console.log(`   Email: admin@dcons.local`);
    console.log(`   Password: Admin@Dcons123`);
    console.log(`   Name: DCONS Administrator`);
    console.log('\n================================\n');

  } catch (error) {
    console.error('Error seeding samples:', error);
    process.exit(1);
  }
}

seedSamples();
