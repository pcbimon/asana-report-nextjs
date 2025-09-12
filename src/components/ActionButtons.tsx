"use client";

import React from 'react';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { RefreshCw, Settings, LogOut, MoreHorizontal } from 'lucide-react';
import ExportButtons from './ExportButtons';
import ActionMenuContent from './ActionMenuContent';
import { Assignee } from '../models/asanaReport';
import { UserRoleLevel } from '../types/userRoles';
import { useRouter } from 'next/navigation';

interface ActionButtonsProps {
  assignee?: Assignee;
  onRefresh?: () => void;
  isLoading?: boolean;
  report?: any;
  assigneeStats?: any;
  subtasks?: any[];
  userRole?: { role_level?: number } | null;
  onSignOut?: () => Promise<void> | void;
  // If provided, the component will use the child element as the dropdown trigger
  triggerAsChild?: boolean;
  triggerElement?: React.ReactNode;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  assignee,
  onRefresh,
  isLoading = false,
  report,
  assigneeStats,
  subtasks = [],
  userRole,
  onSignOut,
  triggerAsChild = false,
  triggerElement,
}) => {
  const router = useRouter();

  return (
    <DropdownMenu>
      {triggerAsChild && triggerElement ? (
        <DropdownMenuTrigger asChild>{triggerElement}</DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="shadow-sm">
            <MoreHorizontal className="h-4 w-4 mr-2" />
            ตัวเลือก
          </Button>
        </DropdownMenuTrigger>
      )}

      <ActionMenuContent
        assignee={assignee}
        onRefresh={onRefresh}
        isLoading={isLoading}
        report={report}
        assigneeStats={assigneeStats}
        subtasks={subtasks}
        userRole={userRole}
        onSignOut={onSignOut}
      />
    </DropdownMenu>
  );
};

export default ActionButtons;
