export function getClientWorkspaceResolutionState({
  userId,
  canAccessClientOperations,
  hasRoleBasedClientPortalAccess,
  clientWorkspaceChecked,
}: {
  userId: string;
  canAccessClientOperations: boolean;
  hasRoleBasedClientPortalAccess: boolean;
  clientWorkspaceChecked: boolean;
}) {
  const shouldResolveClientWorkspace = Boolean(userId)
    && !canAccessClientOperations
    && !hasRoleBasedClientPortalAccess;

  return {
    shouldResolveClientWorkspace,
    isResolvingClientWorkspace: shouldResolveClientWorkspace && !clientWorkspaceChecked,
  };
}
