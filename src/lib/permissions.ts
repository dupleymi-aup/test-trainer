export const Permissions = {
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_ROLE_CHANGE: "users.role_change",
  USERS_IMPORT: "users.import",

  GROUPS_READ: "groups.read",
  GROUPS_CREATE: "groups.create",
  GROUPS_UPDATE: "groups.update",
  GROUPS_DELETE: "groups.delete",
  GROUPS_MANAGE_MEMBERS: "groups.manage_members",
  GROUPS_MANAGE_TASKS: "groups.manage_tasks",

  TASKS_READ: "tasks.read",
  TASKS_CREATE: "tasks.create",
  TASKS_UPDATE: "tasks.update",
  TASKS_DELETE: "tasks.delete",

  ATTEMPTS_READ_OWN: "attempts.read_own",
  ATTEMPTS_READ_ALL: "attempts.read_all",
  ATTEMPTS_SUBMIT: "attempts.submit",

  GRADES_READ: "grades.read",
  GRADES_CREATE: "grades.create",
  GRADES_UPDATE: "grades.update",
  GRADES_DELETE: "grades.delete",

  ANALYTICS_VIEW_OWN: "analytics.view_own",
  ANALYTICS_VIEW_GROUP: "analytics.view_group",
  ANALYTICS_VIEW_ALL: "analytics.view_all",
  ANALYTICS_EXPORT: "analytics.export",

  ANNOUNCEMENTS_READ: "announcements.read",
  ANNOUNCEMENTS_CREATE: "announcements.create",
  ANNOUNCEMENTS_DELETE: "announcements.delete",

  DEADLINES_READ: "deadlines.read",
  DEADLINES_CREATE: "deadlines.create",
  DEADLINES_UPDATE: "deadlines.update",
  DEADLINES_DELETE: "deadlines.delete",

  SETTINGS_READ: "settings.read",
  SETTINGS_UPDATE: "settings.update",

  NOTIFICATIONS_READ: "notifications.read",
  NOTIFICATIONS_MANAGE: "notifications.manage",

  ACTIVITY_LOG_READ: "activity_log.read",

  SYSTEM_ALERTS: "system.alerts",
  SYSTEM_DATABASE: "system.database",
  SYSTEM_CACHE: "system.cache",

  MESSAGES_SEND: "messages.send",
  MESSAGES_READ: "messages.read",
  MESSAGES_DELETE: "messages.delete",

  FAVORITES_MANAGE: "favorites.manage",

  LEADERBOARD_VIEW: "leaderboard.view",

  COURSE_TEMPLATES_READ: "course_templates.read",
  COURSE_TEMPLATES_CREATE: "course_templates.create",
  COURSE_TEMPLATES_UPDATE: "course_templates.update",
  COURSE_TEMPLATES_DELETE: "course_templates.delete",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const RolePermissions: Record<string, Permission[]> = {
  STUDENT: [
    Permissions.TASKS_READ,
    Permissions.ATTEMPTS_READ_OWN,
    Permissions.ATTEMPTS_SUBMIT,
    Permissions.ANALYTICS_VIEW_OWN,
    Permissions.ANNOUNCEMENTS_READ,
    Permissions.DEADLINES_READ,
    Permissions.NOTIFICATIONS_READ,
    Permissions.MESSAGES_READ,
    Permissions.FAVORITES_MANAGE,
    Permissions.LEADERBOARD_VIEW,
  ],
  TEACHER: [
    Permissions.GROUPS_READ,
    Permissions.GROUPS_CREATE,
    Permissions.GROUPS_UPDATE,
    Permissions.GROUPS_DELETE,
    Permissions.GROUPS_MANAGE_MEMBERS,
    Permissions.GROUPS_MANAGE_TASKS,
    Permissions.TASKS_READ,
    Permissions.TASKS_CREATE,
    Permissions.TASKS_UPDATE,
    Permissions.ATTEMPTS_READ_ALL,
    Permissions.GRADES_READ,
    Permissions.GRADES_CREATE,
    Permissions.GRADES_UPDATE,
    Permissions.GRADES_DELETE,
    Permissions.ANALYTICS_VIEW_GROUP,
    Permissions.ANALYTICS_EXPORT,
    Permissions.ANNOUNCEMENTS_READ,
    Permissions.ANNOUNCEMENTS_CREATE,
    Permissions.ANNOUNCEMENTS_DELETE,
    Permissions.DEADLINES_READ,
    Permissions.DEADLINES_CREATE,
    Permissions.DEADLINES_UPDATE,
    Permissions.NOTIFICATIONS_READ,
    Permissions.MESSAGES_SEND,
    Permissions.MESSAGES_READ,
    Permissions.MESSAGES_DELETE,
    Permissions.COURSE_TEMPLATES_READ,
    Permissions.COURSE_TEMPLATES_CREATE,
    Permissions.COURSE_TEMPLATES_UPDATE,
    Permissions.COURSE_TEMPLATES_DELETE,
  ],
  ADMIN: Object.values(Permissions),
};

export function hasPermission(role: string, permission: Permission): boolean {
  const rolePerms = RolePermissions[role];
  if (!rolePerms) return false;
  return rolePerms.includes(permission);
}

export function requirePermission(
  role: string,
  permission: Permission
): { allowed: true } | { allowed: false; error: string } {
  if (hasPermission(role, permission)) {
    return { allowed: true };
  }
  return { allowed: false, error: `Forbidden: missing permission '${permission}'` };
}
