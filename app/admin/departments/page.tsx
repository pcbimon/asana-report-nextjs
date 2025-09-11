/**
 * Admin page for department management
 * CRUD operations for departments
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
  Building2,
  Users
} from 'lucide-react';

interface DepartmentWithUsers {
  id: number;
  department_code: string;
  department_name: string;
  department_name_th: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_roles: Array<{ count: number }>;
}

export default function DepartmentsAdminPage() {
  const [departments, setDepartments] = useState<DepartmentWithUsers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithUsers | null>(null);
  const [formData, setFormData] = useState({
    department_code: '',
    department_name: '',
    department_name_th: '',
    is_active: true
  });

  // Load data
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      } else {
        console.error('Failed to load departments');
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_code: formData.department_code,
          department_name: formData.department_name,
          department_name_th: formData.department_name_th
        })
      });

      if (response.ok) {
        await loadDepartments();
        setIsCreateDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      alert('เกิดข้อผิดพลาดในระบบ');
    }
  };

  const handleUpdate = async () => {
    if (!editingDepartment) return;

    try {
      const response = await fetch('/api/admin/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDepartment.id,
          department_code: formData.department_code,
          department_name: formData.department_name,
          department_name_th: formData.department_name_th,
          is_active: formData.is_active
        })
      });

      if (response.ok) {
        await loadDepartments();
        setIsEditDialogOpen(false);
        setEditingDepartment(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert('เกิดข้อผิดพลาดในระบบ');
    }
  };

  const handleDelete = async (departmentId: number, departmentName: string) => {
    if (!confirm(`ต้องการลบฝ่ายงาน ${departmentName} หรือไม่?`)) return;

    try {
      const response = await fetch(`/api/admin/departments?id=${departmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadDepartments();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('เกิดข้อผิดพลาดในระบบ');
    }
  };

  const resetForm = () => {
    setFormData({
      department_code: '',
      department_name: '',
      department_name_th: '',
      is_active: true
    });
  };

  const openEditDialog = (department: DepartmentWithUsers) => {
    setEditingDepartment(department);
    setFormData({
      department_code: department.department_code,
      department_name: department.department_name,
      department_name_th: department.department_name_th,
      is_active: department.is_active
    });
    setIsEditDialogOpen(true);
  };

  // Filter departments based on search term
  const filteredDepartments = departments.filter(dept =>
    dept.department_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.department_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.department_name_th.includes(searchTerm)
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
          <Building2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">จัดการฝ่ายงาน</h1>
          <Badge variant="secondary">{departments.length} ฝ่าย</Badge>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มฝ่ายงานใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มฝ่ายงานใหม่</DialogTitle>
              <DialogDescription>
                กรอกข้อมูลฝ่ายงานใหม่
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="department_code">รหัสฝ่ายงาน</Label>
                <Input
                  id="department_code"
                  value={formData.department_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, department_code: e.target.value }))}
                  placeholder="เช่น TECH, HR, FINANCE"
                />
              </div>
              <div>
                <Label htmlFor="department_name">ชื่อฝ่ายงาน (English)</Label>
                <Input
                  id="department_name"
                  value={formData.department_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, department_name: e.target.value }))}
                  placeholder="เช่น Technology Department"
                />
              </div>
              <div>
                <Label htmlFor="department_name_th">ชื่อฝ่ายงาน (ไทย)</Label>
                <Input
                  id="department_name_th"
                  value={formData.department_name_th}
                  onChange={(e) => setFormData(prev => ({ ...prev, department_name_th: e.target.value }))}
                  placeholder="เช่น ฝ่ายเทคโนโลยี"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreate} className="flex-1">
                  สร้างฝ่ายงาน
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
          placeholder="ค้นหาฝ่ายงาน (รหัส, ชื่อภาษาไทย, ชื่อภาษาอังกฤษ)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสฝ่ายงาน</TableHead>
              <TableHead>ชื่อฝ่ายงาน (ไทย)</TableHead>
              <TableHead>ชื่อฝ่ายงาน (English)</TableHead>
              <TableHead>จำนวนผู้ใช้</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่สร้าง</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDepartments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  ไม่พบข้อมูลฝ่ายงาน
                </TableCell>
              </TableRow>
            ) : (
              filteredDepartments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium font-mono">
                    {department.department_code}
                  </TableCell>
                  <TableCell className="font-medium">
                    {department.department_name_th}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {department.department_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{department.user_roles?.[0]?.count || 0} คน</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {department.is_active ? (
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
                    {new Date(department.created_at).toLocaleDateString('th-TH')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(department)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        แก้ไข
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(department.id, department.department_name_th)}
                        className="text-red-600 hover:text-red-700"
                        disabled={department.user_roles?.[0]?.count > 0}
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
            <DialogTitle>แก้ไขข้อมูลฝ่ายงาน</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลและสถานะฝ่ายงาน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_department_code">รหัสฝ่ายงาน</Label>
              <Input
                id="edit_department_code"
                value={formData.department_code}
                onChange={(e) => setFormData(prev => ({ ...prev, department_code: e.target.value }))}
                placeholder="เช่น TECH, HR, FINANCE"
              />
            </div>
            <div>
              <Label htmlFor="edit_department_name">ชื่อฝ่ายงาน (English)</Label>
              <Input
                id="edit_department_name"
                value={formData.department_name}
                onChange={(e) => setFormData(prev => ({ ...prev, department_name: e.target.value }))}
                placeholder="เช่น Technology Department"
              />
            </div>
            <div>
              <Label htmlFor="edit_department_name_th">ชื่อฝ่ายงาน (ไทย)</Label>
              <Input
                id="edit_department_name_th"
                value={formData.department_name_th}
                onChange={(e) => setFormData(prev => ({ ...prev, department_name_th: e.target.value }))}
                placeholder="เช่น ฝ่ายเทคโนโลยี"
              />
            </div>
            <div>
              <Label htmlFor="edit_status">สถานะ</Label>
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