/**
 * API endpoint for admin department management
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

// GET - List all departments
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const supabase = createServerSideClient(request);

  try {
    // Get all departments with user count
    const { data: departments, error } = await supabase
      .from('departments')
      .select(`
        id,
        department_code,
        department_name,
        department_name_th,
        is_active,
        created_at,
        updated_at,
        user_roles(count)
      `)
      .order('department_code');

    if (error) {
      console.error('Error fetching departments:', error);
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลฝ่ายงานได้' }, { status: 500 });
    }

    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Error in GET /api/admin/departments:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}

// POST - Create new department
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const supabase = createServerSideClient(request);

  try {
    const body = await request.json();
    const { department_code, department_name, department_name_th } = body;

    if (!department_code || !department_name || !department_name_th) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // Check if department code already exists
    const { data: existingDept } = await supabase
      .from('departments')
      .select('id')
      .eq('department_code', department_code)
      .single();

    if (existingDept) {
      return NextResponse.json({ error: 'รหัสฝ่ายงานนี้มีอยู่แล้ว' }, { status: 400 });
    }

    // Create new department
    const { data: newDepartment, error } = await supabase
      .from('departments')
      .insert({
        department_code,
        department_name,
        department_name_th,
        is_active: true
      })
      .select(`
        id,
        department_code,
        department_name,
        department_name_th,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error creating department:', error);
      return NextResponse.json({ error: 'ไม่สามารถสร้างฝ่ายงานได้' }, { status: 500 });
    }

    return NextResponse.json({ department: newDepartment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/departments:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}

// PUT - Update department
export async function PUT(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const supabase = createServerSideClient(request);

  try {
    const body = await request.json();
    const { id, department_code, department_name, department_name_th, is_active } = body;

    if (!id || !department_code || !department_name || !department_name_th || is_active === undefined) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // Check if new department code already exists (exclude current department)
    const { data: existingDept } = await supabase
      .from('departments')
      .select('id')
      .eq('department_code', department_code)
      .neq('id', id)
      .single();

    if (existingDept) {
      return NextResponse.json({ error: 'รหัสฝ่ายงานนี้มีอยู่แล้ว' }, { status: 400 });
    }

    // Update department
    const { data: updatedDepartment, error } = await supabase
      .from('departments')
      .update({
        department_code,
        department_name,
        department_name_th,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        department_code,
        department_name,
        department_name_th,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating department:', error);
      return NextResponse.json({ error: 'ไม่สามารถอัปเดตฝ่ายงานได้' }, { status: 500 });
    }

    return NextResponse.json({ department: updatedDepartment });
  } catch (error) {
    console.error('Error in PUT /api/admin/departments:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}

// DELETE - Deactivate department
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
      return NextResponse.json({ error: 'ไม่พบ ID ฝ่ายงาน' }, { status: 400 });
    }

    // Check if department has active users
    const { data: activeUsers, error: userCheckError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('department_id', id)
      .eq('is_active', true);

    if (userCheckError) {
      console.error('Error checking active users:', userCheckError);
      return NextResponse.json({ error: 'ไม่สามารถตรวจสอบผู้ใช้ในฝ่ายงานได้' }, { status: 500 });
    }

    if (activeUsers && activeUsers.length > 0) {
      return NextResponse.json({ 
        error: `ไม่สามารถลบฝ่ายงานได้ เนื่องจากมีผู้ใช้งานอยู่ ${activeUsers.length} คน` 
      }, { status: 400 });
    }

    // Soft delete by setting is_active to false
    const { data: deletedDepartment, error } = await supabase
      .from('departments')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, department_code, department_name_th')
      .single();

    if (error) {
      console.error('Error deleting department:', error);
      return NextResponse.json({ error: 'ไม่สามารถลบฝ่ายงานได้' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'ลบฝ่ายงานเรียบร้อยแล้ว', 
      department: deletedDepartment 
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/departments:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}