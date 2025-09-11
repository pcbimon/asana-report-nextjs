/**
 * API endpoint for admin user management
 * Only accessible to users with ADMIN role level
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSideClient } from '../../../../src/lib/supabase-server';
import { UserRoleLevel } from '../../../../src/types/userRoles';

// Verify admin access
async function verifyAdminAccess(request: NextRequest) {
  const supabase = createServerSideClient(request);
  
  // Get current user from session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.user) {
    return { authorized: false, error: 'ไม่พบการเข้าสู่ระบบ' };
  }

  // Check user role
  const { data: roleData, error: roleError } = await supabase
    .rpc('get_user_role', { user_email: session.user.email });

  if (roleError || !roleData || roleData.length === 0) {
    return { authorized: false, error: 'ไม่พบข้อมูลสิทธิ์ผู้ใช้' };
  }

  if (roleData[0].role_level !== UserRoleLevel.ADMIN) {
    return { authorized: false, error: 'ไม่มีสิทธิ์เข้าถึงระบบจัดการ' };
  }

  return { authorized: true, user: session.user, roleData: roleData[0] };
}

// GET - List all users with their roles and departments
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const supabase = createServerSideClient(request);

  try {
    // Get all user roles with department information
    const { data: users, error } = await supabase
      .from('user_roles')
      .select(`
        id,
        email,
        role_level,
        role_name,
        is_active,
        created_at,
        updated_at,
        departments!inner(
          id,
          department_code,
          department_name_th,
          is_active
        )
      `)
      .order('email');

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' }, { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}

// POST - Create new user role
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const supabase = createServerSideClient(request);

  try {
    const body = await request.json();
    const { email, role_level, role_name, department_id } = body;

    if (!email || !role_level || !role_name || !department_id) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // Check if user already exists in this department
    const { data: existingUser } = await supabase
      .from('user_roles')
      .select('id')
      .eq('email', email)
      .eq('department_id', department_id)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'ผู้ใช้นี้มีอยู่ในฝ่ายงานนี้แล้ว' }, { status: 400 });
    }

    // Create new user role
    const { data: newUser, error } = await supabase
      .from('user_roles')
      .insert({
        email,
        role_level,
        role_name,
        department_id,
        is_active: true,
        created_by: authResult.user?.email
      })
      .select(`
        id,
        email,
        role_level,
        role_name,
        is_active,
        created_at,
        updated_at,
        departments!inner(
          id,
          department_code,
          department_name_th,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'ไม่สามารถสร้างผู้ใช้ได้' }, { status: 500 });
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}

// PUT - Update user role
export async function PUT(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const supabase = createServerSideClient(request);

  try {
    const body = await request.json();
    const { id, role_level, role_name, is_active } = body;

    if (!id || role_level === undefined || !role_name || is_active === undefined) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // Update user role
    const { data: updatedUser, error } = await supabase
      .from('user_roles')
      .update({
        role_level,
        role_name,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        email,
        role_level,
        role_name,
        is_active,
        created_at,
        updated_at,
        departments!inner(
          id,
          department_code,
          department_name_th,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'ไม่สามารถอัปเดตผู้ใช้ได้' }, { status: 500 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error in PUT /api/admin/users:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}

// DELETE - Deactivate user role
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const supabase = createServerSideClient(request);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID ผู้ใช้' }, { status: 400 });
    }

    // Soft delete by setting is_active to false
    const { data: deletedUser, error } = await supabase
      .from('user_roles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, email')
      .single();

    if (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json({ error: 'ไม่สามารถลบผู้ใช้ได้' }, { status: 500 });
    }

    return NextResponse.json({ message: 'ลบผู้ใช้เรียบร้อยแล้ว', user: deletedUser });
  } catch (error) {
    console.error('Error in DELETE /api/admin/users:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}