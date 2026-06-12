"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Megaphone,
  RotateCcw,
  Settings2,
  Ticket,
  UserCheck,
} from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Modal from '@/components/Modal';
import { useToast } from '@/components/ToastProvider';
import {
  clearStoredDashboardActionIds,
  DASHBOARD_ACTION_LIMIT,
  getAvailableDashboardActions,
  readStoredDashboardActionIds,
  resolveDashboardActions,
  writeStoredDashboardActionIds,
  type DashboardActionDefinition,
  type DashboardActionId,
} from '@/lib/dashboard-actions';
import type { RoleAccessUser } from '@/lib/role-access';
import { cn } from '@/lib/utils';

type DashboardQuickActionsUser = RoleAccessUser & {
  id?: string | number | null;
};

interface DashboardQuickActionsProps {
  user?: DashboardQuickActionsUser | null;
}

const actionIconMap: Record<DashboardActionDefinition['icon'], React.ComponentType<{ className?: string }>> = {
  clipboard: ClipboardList,
  file: FileText,
  calendar: CalendarDays,
  userCheck: UserCheck,
  megaphone: Megaphone,
  grid: CalendarDays,
  briefcase: Briefcase,
  ticket: Ticket,
};

function QuickActionButton({
  action,
  onClick,
}: {
  action: DashboardActionDefinition;
  onClick: () => void;
}) {
  const Icon = actionIconMap[action.icon];

  return (
    <button
      type="button"
      onClick={onClick}
      className="motion-interactive flex min-h-[86px] items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)] active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
    >
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-2 text-[var(--accent)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{action.label}</div>
        <div className="mt-1 text-xs text-[var(--muted)]">{action.helper}</div>
      </div>
    </button>
  );
}

export default function DashboardQuickActions({ user }: DashboardQuickActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [storedActionIds, setStoredActionIds] = useState<DashboardActionId[] | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftActionIds, setDraftActionIds] = useState<DashboardActionId[]>([]);

  useEffect(() => {
    setStoredActionIds(readStoredDashboardActionIds(user?.id));
  }, [user?.id]);

  const visibleActions = useMemo(
    () => resolveDashboardActions(storedActionIds, user),
    [storedActionIds, user],
  );
  const availableActions = useMemo(
    () => getAvailableDashboardActions(user),
    [user],
  );

  const openSettings = () => {
    setDraftActionIds(visibleActions.map((action) => action.id));
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const toggleDraftAction = (actionId: DashboardActionId) => {
    setDraftActionIds((current) => {
      if (current.includes(actionId)) {
        return current.filter((id) => id !== actionId);
      }

      if (current.length >= DASHBOARD_ACTION_LIMIT) {
        return current;
      }

      return [...current, actionId];
    });
  };

  const moveDraftAction = (actionId: DashboardActionId, direction: -1 | 1) => {
    setDraftActionIds((current) => {
      const currentIndex = current.indexOf(actionId);
      const nextIndex = currentIndex + direction;

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
  };

  const resetQuickActions = () => {
    clearStoredDashboardActionIds(user?.id);
    setStoredActionIds(null);
    setDraftActionIds(resolveDashboardActions(null, user).map((action) => action.id));
    toast.success('Quick actions reset');
  };

  const saveQuickActions = () => {
    const normalizedIds = resolveDashboardActions(draftActionIds, user).map((action) => action.id);
    writeStoredDashboardActionIds(user?.id, normalizedIds);
    setStoredActionIds(normalizedIds);
    setIsSettingsOpen(false);
    toast.success('Quick actions updated');
  };

  return (
    <>
      <Card variant="elevated" className="overflow-hidden">
        <Card.Header>
          <div>
            <h4 className="font-semibold">Quick Actions</h4>
            <p className="mt-1 text-xs text-[var(--muted)]">Pinned shortcuts for your role and daily work.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Settings2 className="h-4 w-4" aria-hidden="true" />}
            onClick={openSettings}
          >
            Customize
          </Button>
        </Card.Header>

        <Card.Content className="grid gap-3 sm:grid-cols-2">
          {visibleActions.map((action) => (
            <QuickActionButton
              key={action.id}
              action={action}
              onClick={() => router.push(action.href)}
            />
          ))}
        </Card.Content>
      </Card>

      <Modal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        title="Customize Quick Actions"
        subtitle="Choose up to four shortcuts. Finance and client operations options follow your account permissions."
        size="lg"
        footer={(
          <>
            <Button
              type="button"
              variant="ghost"
              icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
              onClick={resetQuickActions}
            >
              Reset
            </Button>
            <Button type="button" variant="secondary" onClick={closeSettings}>
              Cancel
            </Button>
            <Button type="button" onClick={saveQuickActions}>
              Save Actions
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2">
            <p className="text-sm text-[var(--muted)]">
              Selected shortcuts appear on the dashboard in the order below.
            </p>
            <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--card-surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)]">
              {draftActionIds.length}/{DASHBOARD_ACTION_LIMIT}
            </span>
          </div>

          <div className="grid gap-2">
            {availableActions.map((action) => {
              const Icon = actionIconMap[action.icon];
              const selectedIndex = draftActionIds.indexOf(action.id);
              const isSelected = selectedIndex !== -1;
              const isDisabled = !isSelected && draftActionIds.length >= DASHBOARD_ACTION_LIMIT;

              return (
                <div
                  key={action.id}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-md)] border p-3 transition-colors',
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--surface-hover)]'
                      : 'border-[var(--border)] bg-[var(--card-bg)]',
                    isDisabled && 'opacity-60',
                  )}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleDraftAction(action.id)}
                    />
                    <span className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-2 text-[var(--accent)]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--foreground)]">{action.label}</span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">{action.helper}</span>
                    </span>
                  </label>

                  {isSelected && (
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="min-w-7 rounded-[var(--radius-sm)] bg-[var(--card-surface)] px-2 py-1 text-center text-xs font-medium text-[var(--muted)]">
                        {selectedIndex + 1}
                      </span>
                      <button
                        type="button"
                        className="motion-interactive rounded-[var(--radius-sm)] border border-[var(--border)] p-1.5 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => moveDraftAction(action.id, -1)}
                        disabled={selectedIndex === 0}
                        aria-label={`Move ${action.label} up`}
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="motion-interactive rounded-[var(--radius-sm)] border border-[var(--border)] p-1.5 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => moveDraftAction(action.id, 1)}
                        disabled={selectedIndex === draftActionIds.length - 1}
                        aria-label={`Move ${action.label} down`}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
}
