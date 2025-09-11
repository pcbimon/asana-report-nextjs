/**
 * Export Buttons Component
 * Export functionality for PDF, Excel, and chart images
 */

'use client';

import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../components/ui/dropdown-menu';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { AsanaReport, Subtask } from '../models/asanaReport';
import { AssigneeStats } from '../lib/dataProcessor';

interface ExportButtonsProps {
  report?: AsanaReport;
  assigneeStats?: AssigneeStats;
  subtasks: Subtask[];
  assigneeName?: string;
  userGid?: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({
  report,
  assigneeStats,
  subtasks,
  assigneeName,
  userGid
}) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Generate CSV data from subtasks
  const generateCSVData = (data: Subtask[]): string => {
    const headers = [
      'ชื่องาน',
      'ผู้รับผิดชอบ',
      'อีเมล',
      'สถานะ',
      'โครงการ',
      'ความสำคัญ',
      'วันที่สร้าง',
      'วันที่เสร็จสิ้น',
      'จำนวนวันที่ใช้'
    ];

    const csvRows = [headers.join(',')];

    data.forEach(subtask => {
      const createdDate = subtask.created_at ? new Date(subtask.created_at).toLocaleDateString('th-TH') : '';
      const completedDate = subtask.completed_at ? new Date(subtask.completed_at).toLocaleDateString('th-TH') : '';
      
      // Calculate days taken if completed
      let daysTaken = '';
      if (subtask.completed && subtask.created_at && subtask.completed_at) {
        const start = new Date(subtask.created_at);
        const end = new Date(subtask.completed_at);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysTaken = diffDays.toString();
      }

      const row = [
        `"${subtask.name?.replace(/"/g, '""') || ''}"`,
        `"${subtask.assignee?.name?.replace(/"/g, '""') || ''}"`,
        `"${subtask.assignee?.email?.replace(/"/g, '""') || ''}"`,
        subtask.completed ? 'เสร็จสิ้น' : 'อยู่ระหว่างดำเนินการ',
        `"${subtask.project?.replace(/"/g, '""') || ''}"`,
        `"${subtask.priority?.replace(/"/g, '""') || ''}"`,
        createdDate,
        completedDate,
        daysTaken
      ];
      
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  // Download file helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to CSV/Excel
  const exportToExcel = async () => {
    setIsExporting('excel');
    try {
      const csvData = generateCSVData(subtasks);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `asana-report-${assigneeName || 'all'}-${timestamp}.csv`;
      
      // Add BOM for proper UTF-8 encoding in Excel
      const csvWithBOM = '\ufeff' + csvData;
      downloadFile(csvWithBOM, filename, 'text/csv;charset=utf-8;');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
    } finally {
      setIsExporting(null);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    setIsExporting('pdf');
    try {
      // Import html2canvas and jspdf dynamically to reduce bundle size
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      // Create a printable version of the dashboard
      const printContent = document.createElement('div');
      printContent.style.position = 'absolute';
      printContent.style.left = '-9999px';
      printContent.style.width = '1200px';
      printContent.style.backgroundColor = 'white';
      printContent.style.padding = '20px';

      // Generate report content
      const reportHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px;">รายงาน Asana Dashboard</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">
              ${assigneeName ? `ของ ${assigneeName}` : 'รายงานทั่วไป'} • สร้างเมื่อ ${new Date().toLocaleDateString('th-TH')}
            </p>
          </div>
          
          ${assigneeStats ? `
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
              <div style="font-size: 32px; font-weight: bold; color: #3b82f6; margin-bottom: 8px;">${assigneeStats.totalTasks}</div>
              <div style="color: #6b7280; font-size: 14px;">งานทั้งหมด</div>
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
              <div style="font-size: 32px; font-weight: bold; color: #16a34a; margin-bottom: 8px;">${assigneeStats.completedTasks}</div>
              <div style="color: #6b7280; font-size: 14px;">เสร็จสิ้น</div>
            </div>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #fecaca;">
              <div style="font-size: 32px; font-weight: bold; color: #dc2626; margin-bottom: 8px;">${assigneeStats.overdueTasks}</div>
              <div style="color: #6b7280; font-size: 14px;">เลยกำหนด</div>
            </div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
              <div style="font-size: 32px; font-weight: bold; color: #7c3aed; margin-bottom: 8px;">${Math.round(assigneeStats.completionRate)}%</div>
              <div style="color: #6b7280; font-size: 14px;">อัตราความสำเร็จ</div>
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px;">
            <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
              รายการงาน (${subtasks.length} รายการ)
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">ชื่องาน</th>
                  <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">ผู้รับผิดชอบ</th>
                  <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">สถานะ</th>
                  <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">ความสำคัญ</th>
                  <th style="padding: 12px; text-align: center; border: 1px solid #e5e7eb;">โครงการ</th>
                </tr>
              </thead>
              <tbody>
                ${subtasks.slice(0, 50).map((subtask, index) => `
                  <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f9fafb;' : ''}">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${subtask.name || ''}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${subtask.assignee?.name || ''}</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">
                      <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; 
                        ${subtask.completed ? 'background: #dcfce7; color: #166534;' : 'background: #fef3c7; color: #92400e;'}">
                        ${subtask.completed ? 'เสร็จสิ้น' : 'อยู่ระหว่างดำเนินการ'}
                      </span>
                    </td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">${subtask.priority || '-'}</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">${subtask.project || '-'}</td>
                  </tr>
                `).join('')}
                ${subtasks.length > 50 ? `
                  <tr>
                    <td colspan="5" style="padding: 15px; text-align: center; color: #6b7280; border: 1px solid #e5e7eb;">
                      ... และอีก ${subtasks.length - 50} รายการ (ดูรายละเอียดเพิ่มเติมในไฟล์ Excel)
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            สร้างโดย Asana Dashboard • ${new Date().toLocaleString('th-TH')}
          </div>
        </div>
      `;

      printContent.innerHTML = reportHTML;
      document.body.appendChild(printContent);

      // Generate PDF
      const canvas = await html2canvas(printContent, {
        scale: 1,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(printContent);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `asana-report-${assigneeName || 'all'}-${timestamp}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ PDF');
    } finally {
      setIsExporting(null);
    }
  };

  // Export chart as image
  const exportChartImage = async (chartId: string, chartName: string) => {
    setIsExporting('chart');
    try {
      const chartElement = document.getElementById(chartId);
      if (!chartElement) {
        alert('ไม่พบกราฟที่ต้องการส่งออก');
        return;
      }

      const { default: html2canvas } = await import('html2canvas');
      
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${chartName}-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting chart:', error);
      alert('เกิดข้อผิดพลาดในการส่งออกรูปภาพกราฟ');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? 'กำลังส่งออก...' : 'ส่งออกข้อมูล'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={exportToPDF} disabled={!!isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          ส่งออกเป็น PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} disabled={!!isExporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          ส่งออกเป็น Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => exportChartImage('weekly-summary-chart', 'สรุปรายสัปดาห์')}
          disabled={!!isExporting}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          กราฟสรุปรายสัปดาห์
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => exportChartImage('distribution-charts', 'กราฟแจกแจง')}
          disabled={!!isExporting}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          กราฟแจกแจง
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButtons;