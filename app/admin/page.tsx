/**
 * Admin Dashboard - Overview page for system management
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Users, Building2, BarChart3, Settings, UserCheck, Database } from 'lucide-react';

export default function AdminIndexPage() {
  const router = useRouter();

  const adminCards = [
    {
      title: 'จัดการผู้ใช้งาน',
      description: 'เพิ่ม แก้ไข และจัดการบทบาทของผู้ใช้งานในระบบ',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500 hover:bg-blue-600',
      stats: 'ผู้ใช้งานทั้งหมด'
    },
    {
      title: 'จัดการฝ่ายงาน',
      description: 'จัดการข้อมูลฝ่ายงานและโครงสร้างองค์กร',
      icon: Building2,
      href: '/admin/departments',
      color: 'bg-green-500 hover:bg-green-600',
      stats: 'ฝ่ายงานทั้งหมด'
    },
    {
      title: 'ภาพรวมระบบ',
      description: 'ดูสถิติการใช้งานและประสิทธิภาพระบบ',
      icon: BarChart3,
      href: '/dashboard',
      color: 'bg-purple-500 hover:bg-purple-600',
      stats: 'กลับสู่แดชบอร์ด'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="h-8 w-8" />
          <h1 className="text-3xl font-bold">ระบบจัดการ</h1>
        </div>
        <p className="text-blue-100 text-lg">
          จัดการผู้ใช้งาน ฝ่ายงาน และการตั้งค่าระบบ Asana Report
        </p>
        <div className="mt-6 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-blue-200" />
            <span className="text-blue-100">สิทธิ์ผู้ดูแลระบบ</span>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-200" />
            <span className="text-blue-100">เข้าถึงข้อมูลทั้งหมด</span>
          </div>
        </div>
      </div>

      {/* Management cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div key={card.href} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-3 rounded-lg ${card.color} text-white`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {card.title}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  {card.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {card.stats}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => router.push(card.href)}
                    className={card.color}
                  >
                    เข้าใช้งาน
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">การดำเนินการด่วน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/users')}
            className="justify-start"
          >
            <Users className="h-4 w-4 mr-2" />
            เพิ่มผู้ใช้งานใหม่
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/departments')}
            className="justify-start"
          >
            <Building2 className="h-4 w-4 mr-2" />
            เพิ่มฝ่ายงานใหม่
          </Button>
        </div>
      </div>

      {/* System info */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">ข้อมูลระบบ</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">เวอร์ชันระบบ:</span>
            <span className="ml-2 font-medium">v1.0.0</span>
          </div>
          <div>
            <span className="text-gray-500">สถานะ:</span>
            <span className="ml-2 font-medium text-green-600">ใช้งานได้</span>
          </div>
          <div>
            <span className="text-gray-500">อัปเดตล่าสุด:</span>
            <span className="ml-2 font-medium">{new Date().toLocaleDateString('th-TH')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}