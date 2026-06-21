import type { User } from './users';

export interface ChatUserPickerSection {
  id: string;
  title: string;
  subtitle: string;
  users: User[];
}

function getUserDisplayName(user: Pick<User, 'email' | 'name'>): string {
  return user.name?.trim() || user.email;
}

function userMatchesChatPickerQuery(user: User, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const roleText = (user.roles || [])
    .map((role) => `${role.role} ${role.department?.name || ''}`)
    .join(' ');

  const haystack = [
    user.name,
    user.email,
    user.employeeProfile?.jobTitle,
    user.manager?.name,
    user.manager?.email,
    roleText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function sortUsersByName(users: User[]): User[] {
  return [...users].sort((left, right) => getUserDisplayName(left).localeCompare(getUserDisplayName(right)));
}

function addSection(sections: ChatUserPickerSection[], section: ChatUserPickerSection) {
  if (section.users.length === 0) return;
  sections.push({ ...section, users: sortUsersByName(section.users) });
}

export function getChatUserRoleSummary(user: User): string {
  const primaryRole = user.roles?.[0];
  if (primaryRole?.department?.name) return `${primaryRole.role} - ${primaryRole.department.name}`;
  if (primaryRole?.role) return primaryRole.role;
  if (user.employeeProfile?.jobTitle) return user.employeeProfile.jobTitle;
  return user.email;
}

export function buildChatUserPickerSections(
  users: User[],
  currentUserId: string | undefined,
  query = '',
): ChatUserPickerSection[] {
  const currentUser = users.find((user) => user.id === currentUserId);
  const candidates = users.filter((user) => user.id !== currentUserId && userMatchesChatPickerQuery(user, query));
  const usedIds = new Set<string>();
  const take = (predicate: (user: User) => boolean) => {
    const sectionUsers = candidates.filter((user) => !usedIds.has(user.id) && predicate(user));
    sectionUsers.forEach((user) => usedIds.add(user.id));
    return sectionUsers;
  };

  const sections: ChatUserPickerSection[] = [];

  if (currentUser?.managerId) {
    addSection(sections, {
      id: 'manager',
      title: 'Your Manager',
      subtitle: 'Pulled from the Operations org chart',
      users: take((user) => user.id === currentUser.managerId),
    });
  }

  addSection(sections, {
    id: 'direct-reports',
    title: 'Direct Reports',
    subtitle: 'People who report to you in the org chart',
    users: take((user) => user.managerId === currentUserId),
  });

  if (currentUser?.managerId) {
    addSection(sections, {
      id: 'team',
      title: 'Your Team',
      subtitle: 'Peers with the same visible manager',
      users: take((user) => user.managerId === currentUser.managerId),
    });
  }

  addSection(sections, {
    id: 'directory',
    title: 'Company Directory',
    subtitle: 'Other active internal teammates',
    users: take(() => true),
  });

  return sections;
}
