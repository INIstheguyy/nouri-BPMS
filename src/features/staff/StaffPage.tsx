import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import {
  inviteStaff,
  listStaff,
  type StaffFilters,
  type StaffRole,
  updateStaffAccess,
  updateStaffRole,
} from './api'
import { useAuth } from '../auth/useAuth'

const initialFilters: StaffFilters = { search: '', page: 1, pageSize: 20 }

export function StaffPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(initialFilters)
  const [draftSearch, setDraftSearch] = useState('')
  const [invite, setInvite] = useState({
    email: '',
    fullName: '',
    roleCode: 'ORDER_MANAGER' as StaffRole,
  })
  const [notice, setNotice] = useState<string | null>(null)
  const canManage = auth.hasPermission('staff.manage')
  const staffQuery = useQuery({
    queryKey: ['staff', filters],
    queryFn: () => listStaff(filters),
  })
  const refreshStaff = () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  const inviteMutation = useMutation({ mutationFn: inviteStaff, onSuccess: refreshStaff })
  const accessMutation = useMutation({ mutationFn: updateStaffAccess, onSuccess: refreshStaff })
  const roleMutation = useMutation({ mutationFn: updateStaffRole, onSuccess: refreshStaff })
  const pages = Math.max(1, Math.ceil((staffQuery.data?.total ?? 0) / filters.pageSize))

  async function submitInvite(event: React.FormEvent) {
    event.preventDefault()
    setNotice(null)
    try {
      await inviteMutation.mutateAsync({
        email: invite.email.trim().toLowerCase(),
        fullName: invite.fullName.trim(),
        roleCode: invite.roleCode,
      })
      setInvite({ email: '', fullName: '', roleCode: 'ORDER_MANAGER' })
      setNotice('Invitation sent. The staff member can use the emailed link to set a password.')
    } catch {
      // The mutation state renders a stable, non-sensitive message.
    }
  }

  return (
    <section className="staff-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Executive administration</p>
          <h1>Staff</h1>
          <p>Invite teammates, assign one operational role, and control application access.</p>
        </div>
      </div>

      {canManage && (
        <form className="workspace-card admin-form" onSubmit={(event) => void submitInvite(event)}>
          <div>
            <p className="eyebrow">New account</p>
            <h2>Invite staff member</h2>
          </div>
          <div className="admin-form-grid">
            <label>
              Full name
              <input
                required
                minLength={2}
                maxLength={160}
                value={invite.fullName}
                onChange={(event) =>
                  setInvite((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={invite.email}
                onChange={(event) =>
                  setInvite((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label>
              Role
              <select
                value={invite.roleCode}
                onChange={(event) =>
                  setInvite((current) => ({
                    ...current,
                    roleCode: event.target.value as StaffRole,
                  }))
                }
              >
                <option value="ORDER_MANAGER">Order Manager</option>
                <option value="EXECUTIVE_ADMIN">Executive Admin</option>
              </select>
            </label>
            <button className="secondary-action" disabled={inviteMutation.isPending} type="submit">
              {inviteMutation.isPending ? 'Sending...' : 'Send invitation'}
            </button>
          </div>
          {inviteMutation.isError && (
            <div className="form-error">
              The invitation could not be sent. Confirm the email is not already in use.
            </div>
          )}
          {notice && <div className="form-success">{notice}</div>}
          <small>Local invitation emails are available in Mailpit at http://127.0.0.1:55324.</small>
        </form>
      )}

      <form
        className="customer-filters"
        onSubmit={(event) => {
          event.preventDefault()
          setFilters((current) => ({ ...current, search: draftSearch.trim(), page: 1 }))
        }}
      >
        <label>
          <span>Search by name or email</span>
          <input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} />
        </label>
        <button className="secondary-action" type="submit">
          Search
        </button>
      </form>

      {(accessMutation.isError || roleMutation.isError) && (
        <div className="form-error">
          The access change could not be saved. Refresh and try again.
        </div>
      )}
      {staffQuery.isPending && <div className="workspace-state">Loading staff...</div>}
      {staffQuery.isError && <div className="form-error">We could not load staff.</div>}
      {staffQuery.data?.staff.length === 0 && (
        <div className="workspace-state">No staff match this search.</div>
      )}

      {staffQuery.data && staffQuery.data.staff.length > 0 && (
        <div className="orders-table-wrap">
          <table className="orders-table staff-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {staffQuery.data.staff.map((member) => {
                const isSelf = member.user_id === auth.access?.profileId
                return (
                  <tr key={member.user_id}>
                    <td>
                      <strong>{member.full_name}</strong>
                      <small>
                        {member.email}
                        {isSelf ? ' · You' : ''}
                      </small>
                    </td>
                    <td>
                      <select
                        aria-label={`Role for ${member.full_name}`}
                        disabled={!canManage || isSelf || roleMutation.isPending}
                        value={member.role_code ?? ''}
                        onChange={(event) =>
                          roleMutation.mutate({
                            userId: member.user_id,
                            roleCode: event.target.value as StaffRole,
                          })
                        }
                      >
                        <option value="" disabled>
                          Unassigned
                        </option>
                        <option value="ORDER_MANAGER">Order Manager</option>
                        <option value="EXECUTIVE_ADMIN">Executive Admin</option>
                      </select>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${member.active ? 'status-active' : 'status-inactive'}`}
                      >
                        {member.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(
                        new Date(member.created_at),
                      )}
                    </td>
                    <td>
                      <button
                        className="table-action"
                        disabled={!canManage || isSelf || accessMutation.isPending}
                        type="button"
                        onClick={() =>
                          accessMutation.mutate({ userId: member.user_id, active: !member.active })
                        }
                      >
                        {member.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination" aria-label="Staff pages">
        <button
          type="button"
          disabled={filters.page <= 1}
          onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
        >
          Previous
        </button>
        <span>
          Page {filters.page} of {pages} · {staffQuery.data?.total ?? 0} staff
        </span>
        <button
          type="button"
          disabled={filters.page >= pages}
          onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
        >
          Next
        </button>
      </div>
    </section>
  )
}
