/**
 * Admin page for user management
 * CRUD operations for user roles and department assignments
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  AlertCircle,
  CheckCircle,
  Users
} from 'lucide-react';
import { UserRoleLevel, getRoleNameThai } from '../../../src/types/userRoles';

interface UserRoleWithDepartment {
  id: number;
  email: string;
  role_level: UserRoleLevel;
  role_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  departments: {
    id: number;
    department_code: string;
    department_name_th: string;
    is_active: boolean;
  };
}

interface Department {
  id: number;
  department_code: string;
  department_name_th: string;
  is_active: boolean;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRoleWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRoleWithDepartment | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    role_level: UserRoleLevel.OPERATIONAL,
    role_name: getRoleNameThai(UserRoleLevel.OPERATIONAL),
    department_id: '',
    is_active: true
  });

  // Load data
  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments?.filter((d: Department) => d.is_active) || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          role_level: formData.role_level,
          role_name: formData.role_name,
          department_id: parseInt(formData.department_id)
        })
      });

      if (response.ok) {
        await loadUsers();
        setIsCreateDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('เกิดข้อผิดพลาดในระบบ');
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          role_level: formData.role_level,
          role_name: formData.role_name,
          is_active: formData.is_active,
          department_id: parseInt(formData.department_id)
        })
      });

      if (response.ok) {
        await loadUsers();
        setIsEditDialogOpen(false);
        setEditingUser(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('เกิดข้อผิดพลาดในระบบ');
    }
  };

  const handleDelete = async (userId: number, userEmail: string) => {
    if (!confirm(`ต้องการลบผู้ใช้ ${userEmail} หรือไม่?`)) return;

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('เกิดข้อผิดพลาดในระบบ');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      role_level: UserRoleLevel.OPERATIONAL,
      role_name: getRoleNameThai(UserRoleLevel.OPERATIONAL),
      department_id: '',
      is_active: true
    });
  };

  const openEditDialog = (user: UserRoleWithDepartment) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      role_level: user.role_level,
      role_name: user.role_name,
      department_id: user.departments.id.toString(),
      is_active: user.is_active
    });
    setIsEditDialogOpen(true);
  };

  const handleRoleChange = (roleLevel: string) => {
    const level = parseInt(roleLevel) as UserRoleLevel;
    setFormData(prev => ({
      ...prev,
      role_level: level,
      role_name: getRoleNameThai(level)
    }));
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role_name.includes(searchTerm) ||
    user.departments.department_name_th.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
          <Badge variant="secondary">{users.length} ผู้ใช้</Badge>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มผู้ใช้ใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
              <DialogDescription>
                กรอกข้อมูลผู้ใช้และกำหนดสิทธิ์
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="department">ฝ่ายงาน</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกฝ่ายงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.department_name_th} ({dept.department_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">ระดับสิทธิ์</Label>
                <Select
                  value={formData.role_level.toString()}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRoleLevel.OPERATIONAL.toString()}>
                      {getRoleNameThai(UserRoleLevel.OPERATIONAL)}
                    </SelectItem>
                    <SelectItem value={UserRoleLevel.MANAGER.toString()}>
                      {getRoleNameThai(UserRoleLevel.MANAGER)}
                    </SelectItem>
                    <SelectItem value={UserRoleLevel.DEPUTY_DIRECTOR.toString()}>
                      {getRoleNameThai(UserRoleLevel.DEPUTY_DIRECTOR)}
                    </SelectItem>
                    <SelectItem value={UserRoleLevel.DIRECTOR.toString()}>
                      {getRoleNameThai(UserRoleLevel.DIRECTOR)}
                    </SelectItem>
                    <SelectItem value={UserRoleLevel.ADMIN.toString()}>
                      {getRoleNameThai(UserRoleLevel.ADMIN)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreate} className="flex-1">
                  สร้างผู้ใช้
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="ค้นหาผู้ใช้งาน (อีเมล, ตำแหน่ง, ฝ่ายงาน)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>อีเมล</TableHead>
              <TableHead>ตำแหน่ง</TableHead>
              <TableHead>ฝ่ายงาน</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่สร้าง</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  ไม่พบข้อมูลผู้ใช้
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role_level >= UserRoleLevel.DEPUTY_DIRECTOR ? 'default' : 'secondary'}>
                      {user.role_name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.departments.department_name_th}
                    <span className="text-sm text-gray-500 ml-1">
                      ({user.departments.department_code})
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        ใช้งาน
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        ปิดใช้งาน
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('th-TH')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        แก้ไข
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id, user.email)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        ลบ
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
            <DialogDescription>
              แก้ไขสิทธิ์, ฝ่ายงาน และสถานะผู้ใช้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>อีเมล</Label>
              <Input value={formData.email} disabled />
            </div>
            <div>
              <Label htmlFor="edit-department">ฝ่ายงาน</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกฝ่ายงาน" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.department_name_th} ({dept.department_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-role">ระดับสิทธิ์</Label>
              <Select
                value={formData.role_level.toString()}
                onValueChange={handleRoleChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRoleLevel.OPERATIONAL.toString()}>
                    {getRoleNameThai(UserRoleLevel.OPERATIONAL)}
                  </SelectItem>
                  <SelectItem value={UserRoleLevel.MANAGER.toString()}>
                    {getRoleNameThai(UserRoleLevel.MANAGER)}
                  </SelectItem>
                  <SelectItem value={UserRoleLevel.DEPUTY_DIRECTOR.toString()}>
                    {getRoleNameThai(UserRoleLevel.DEPUTY_DIRECTOR)}
                  </SelectItem>
                  <SelectItem value={UserRoleLevel.DIRECTOR.toString()}>
                    {getRoleNameThai(UserRoleLevel.DIRECTOR)}
                  </SelectItem>
                  <SelectItem value={UserRoleLevel.ADMIN.toString()}>
                    {getRoleNameThai(UserRoleLevel.ADMIN)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">สถานะ</Label>
              <Select
                value={formData.is_active.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value === 'true' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">ใช้งาน</SelectItem>
                  <SelectItem value="false">ปิดใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdate} className="flex-1">
                บันทึกการเปลี่ยนแปลง
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}