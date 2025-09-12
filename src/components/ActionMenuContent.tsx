"use client";

import React from "react";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../../components/ui/dropdown-menu";
import { RefreshCw, Settings, LogOut } from "lucide-react";
import ExportButtons from "./ExportButtons";
import { Assignee } from "../models/asanaReport";
import { UserRoleLevel } from "../types/userRoles";
import { useRouter } from "next/navigation";

interface ActionMenuContentProps {
  assignee?: Assignee;
  onRefresh?: () => void;
  isLoading?: boolean;
  report?: any;
  assigneeStats?: any;
  subtasks?: any[];
  userRole?: { role_level?: number; role_name?: string } | null;
  onSignOut?: () => Promise<void> | void;
}

const ActionMenuContent: React.FC<ActionMenuContentProps> = ({
  assignee,
  onRefresh,
  isLoading = false,
  report,
  assigneeStats,
  subtasks = [],
  userRole,
  onSignOut,
}) => {
  const router = useRouter();

  return (
    <DropdownMenuContent align="end" className="w-56 bg-white">
      {/* Admin link */}
      {userRole?.role_level === UserRoleLevel.ADMIN && (
        <DropdownMenuItem onClick={() => router.push("/admin")} className="hover:bg-gray-50 hover:cursor-pointer">
          <Settings className="h-4 w-4 mr-2" />
          ระบบจัดการ
        </DropdownMenuItem>
      )}

      {/* Refresh - now cache-only */}
      <DropdownMenuItem onClick={onRefresh} disabled={!!isLoading} className="hover:bg-gray-50 hover:cursor-pointer">
        <RefreshCw
          className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
        />
        {isLoading ? "กำลังโหลด..." : "รีเฟรชจากแคช"}
      </DropdownMenuItem>

      <DropdownMenuSeparator />
      <ExportButtons
        report={report}
        assigneeStats={assigneeStats}
        subtasks={subtasks}
        assigneeName={assignee?.name}
        userGid={assignee?.gid}
      />

      <DropdownMenuSeparator />

      {/* Sign out */}
      <DropdownMenuItem
        className="hover:bg-gray-50 hover:cursor-pointer"
        onClick={async () => {
          if (onSignOut) await onSignOut();
        }}
      >
        <LogOut className="h-4 w-4 mr-2" />
        ออกจากระบบ
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};

export default ActionMenuContent;
