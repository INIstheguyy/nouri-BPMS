import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { queryKeys } from '../../shared/lib/query-keys'
import { BottomSheet } from '../../shared/ui/BottomSheet'
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/ScreenState'
import { useToast } from '../../shared/ui/Toast'
import { useAuth } from '../auth/useAuth'
import { inviteStaff, listStaff, type StaffMember, type StaffRole, updateStaffAccess } from './api'

type StaffPageData = Awaited<ReturnType<typeof listStaff>>

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function roleLabel(role: string | null) {
  if (!role) return 'Unassigned'
  return role
    .toLowerCase()
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
}

function StaffRow({
  member,
  isSelf,
  canManage,
  isUpdating,
  onToggle,
}: {
  member: StaffMember
  isSelf: boolean
  canManage: boolean
  isUpdating: boolean
  onToggle: () => void
}) {
  return (
    <article className="staff-row">
      <span className="staff-avatar">{initials(member.full_name)}</span>
      <span className="staff-identity">
        <strong>
          {member.full_name}
          {isSelf && <small> (you)</small>}
        </strong>
        <span>{member.email}</span>
      </span>
      <span className="staff-role">{roleLabel(member.role_code)}</span>
      <span className={`staff-status ${member.active ? 'is-active' : ''}`}>
        {member.active ? 'Active' : 'Inactive'}
      </span>
      <label className="staff-switch">
        <span className="sr-only">Active access for {member.full_name}</span>
        <input
          checked={member.active}
          disabled={!canManage || isSelf || isUpdating}
          onChange={onToggle}
          type="checkbox"
        />
        <span aria-hidden="true" />
      </label>
    </article>
  )
}

export function StaffPage() {
  const auth = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const canManage = auth.hasPermission('staff.manage')
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [invite, setInvite] = useState({
    email: '',
    fullName: '',
    roleCode: 'ORDER_MANAGER' as StaffRole,
  })
  const filters = { search: '', page: 1, pageSize: 100 }
  const staffQuery = useQuery({
    queryKey: queryKeys.staff.list(filters),
    queryFn: () => listStaff(filters),
  })
  const visibleStaff = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const staff = staffQuery.data?.staff ?? []
    if (!query) return staff
    return staff.filter(
      (member) =>
        member.full_name.toLocaleLowerCase().includes(query) ||
        member.email.toLocaleLowerCase().includes(query),
    )
  }, [search, staffQuery.data])

  const accessMutation = useMutation({
    mutationFn: updateStaffAccess,
    onMutate: async ({ userId, active }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.staff.all() })
      const previous = queryClient.getQueriesData<StaffPageData>({
        queryKey: queryKeys.staff.all(),
      })
      queryClient.setQueriesData<StaffPageData>({ queryKey: queryKeys.staff.all() }, (current) =>
        current
          ? {
              ...current,
              staff: current.staff.map((member) =>
                member.user_id === userId ? { ...member, active } : member,
              ),
            }
          : current,
      )
      return { previous }
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all() }),
  })
  const inviteMutation = useMutation({
    mutationFn: inviteStaff,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff.all() })
      setSheetOpen(false)
      setInvite({ email: '', fullName: '', roleCode: 'ORDER_MANAGER' })
      toast('Invitation sent successfully.')
    },
  })

  return (
    <section className="staff-page staff-redesign">
      <header className="staff-heading">
        <div>
          <p className="eyebrow">Team access</p>
          <h1>Staff</h1>
          <p>Invite teammates and control who can access operations.</p>
        </div>
        {canManage && (
          <button className="staff-invite" onClick={() => setSheetOpen(true)} type="button">
            + Invite
          </button>
        )}
      </header>

      <label className="people-search staff-search">
        <span className="sr-only">Search staff</span>
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path
            d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email"
          type="search"
          value={search}
        />
      </label>

      {accessMutation.isError && <ErrorState>The access change could not be saved.</ErrorState>}
      {staffQuery.isPending && <LoadingState>Loading staff...</LoadingState>}
      {staffQuery.isError && <ErrorState>Staff could not be loaded.</ErrorState>}
      {!staffQuery.isPending && visibleStaff.length === 0 && (
        <EmptyState>No staff match this search.</EmptyState>
      )}

      <div className="staff-list">
        {visibleStaff.map((member) => {
          const isSelf = member.user_id === auth.access?.profileId
          return (
            <StaffRow
              key={member.user_id}
              canManage={canManage}
              isSelf={isSelf}
              isUpdating={
                accessMutation.isPending && accessMutation.variables?.userId === member.user_id
              }
              member={member}
              onToggle={() =>
                accessMutation.mutate({ userId: member.user_id, active: !member.active })
              }
            />
          )
        })}
      </div>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Invite staff member"
      >
        <form
          className="invite-sheet-form"
          onSubmit={(event) => {
            event.preventDefault()
            inviteMutation.mutate({
              email: invite.email.trim().toLowerCase(),
              fullName: invite.fullName.trim(),
              roleCode: invite.roleCode,
            })
          }}
        >
          <label>
            Full name
            <input
              maxLength={160}
              minLength={2}
              onChange={(event) =>
                setInvite((current) => ({ ...current, fullName: event.target.value }))
              }
              required
              value={invite.fullName}
            />
          </label>
          <label>
            Email
            <input
              onChange={(event) =>
                setInvite((current) => ({ ...current, email: event.target.value }))
              }
              required
              type="email"
              value={invite.email}
            />
          </label>
          <label>
            Role
            <select
              onChange={(event) =>
                setInvite((current) => ({ ...current, roleCode: event.target.value as StaffRole }))
              }
              value={invite.roleCode}
            >
              <option value="ORDER_MANAGER">Order Manager</option>
              <option value="EXECUTIVE_ADMIN">Executive Admin</option>
            </select>
          </label>
          {inviteMutation.isError && (
            <ErrorState>
              The invitation could not be sent. Check whether that email is already in use.
            </ErrorState>
          )}
          <button className="staff-invite" disabled={inviteMutation.isPending} type="submit">
            {inviteMutation.isPending ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      </BottomSheet>
    </section>
  )
}
