import assert from 'node:assert/strict'
import {
  canReadTask,
  canRequestAssigneeTasks,
  getPrimaryTaskAssignment,
  getTaskVisibilityFilter,
  hasTaskAssignmentPrivilege,
  normalizeRoleName,
} from '../src/tasks/tasks.permissions'

const department = { id: 'dept-website', name: 'Website Developers' }

assert.equal(normalizeRoleName('Operations Manager'), 'operations_manager')
assert.equal(normalizeRoleName(' operations_manager '), 'operations_manager')

assert.equal(
  hasTaskAssignmentPrivilege([{ role: 'Operations Manager', departmentId: department.id }]),
  true,
)
assert.equal(
  hasTaskAssignmentPrivilege([{ role: 'Web Development Assistant', departmentId: department.id }]),
  false,
)

assert.deepEqual(
  getPrimaryTaskAssignment([
    { role: 'admin', departmentId: null },
    { role: 'Web Development Assistant', departmentId: department.id, department },
  ]),
  {
    role: 'Web Development Assistant',
    departmentId: department.id,
    departmentName: department.name,
  },
)

assert.equal(getPrimaryTaskAssignment([{ role: 'admin', departmentId: null }]), null)

const employeeAccess = {
  requesterId: 'user-1',
  isPrivileged: false,
}

const managerAccess = {
  requesterId: 'manager-1',
  isPrivileged: true,
}

assert.deepEqual(getTaskVisibilityFilter(employeeAccess), {
  OR: [
    { assigneeId: 'user-1' },
    { createdById: 'user-1' },
  ],
})
assert.deepEqual(getTaskVisibilityFilter(managerAccess), {})

assert.equal(canReadTask(employeeAccess, { assigneeId: 'user-1' }), true)
assert.equal(canReadTask(employeeAccess, { assigneeId: 'user-2', createdById: 'user-1' }), true)
assert.equal(canReadTask(employeeAccess, { assigneeId: 'user-2' }), false)
assert.equal(canReadTask(managerAccess, { assigneeId: 'user-2' }), true)

assert.equal(canRequestAssigneeTasks(employeeAccess, 'user-1'), true)
assert.equal(canRequestAssigneeTasks(employeeAccess, 'user-2'), false)
assert.equal(canRequestAssigneeTasks(managerAccess, 'user-2'), true)

console.log('tasks.permissions tests passed')
