import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Users, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  BRANCH_STAFF_ROLE_LABELS,
  type BranchStaffRole,
} from '../lib/permissions';
import {
  createBranchStaff,
  fetchBranchStaff,
  fetchOwnerBranch,
  setBranchStaffStatus,
  type BranchStaffMember,
} from './lib/branchStaffService';
import '../hq/pages/StaffDirectoryPage.css';

const ROLE_OPTIONS: BranchStaffRole[] = ['barista'];

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'barista' as BranchStaffRole,
};

export default function StaffManagementPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [staff, setStaff] = useState<BranchStaffMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const branch = await fetchOwnerBranch(userId);
    if (!branch) {
      setNotice('Your account is not linked to a branch. Contact HQ.');
      setLoading(false);
      return;
    }

    setBranchId(branch.id);
    setBranchName(branch.name);
    const rows = await fetchBranchStaff(branch.id);
    setStaff(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const displayStaff = staff ?? [];
  const usingSample = staff === null && !loading;

  const summary = useMemo(() => {
    const total = displayStaff.length;
    const active = displayStaff.filter((s) => s.status === 'active').length;
    return { total, active };
  }, [displayStaff]);

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim() || form.password.length < 6) {
      setNotice('Full name, email, and a password of at least 6 characters are required.');
      return;
    }
    setSaving(true);
    setNotice('Creating barista account — this may take a few seconds…');
    try {
      const result = await createBranchStaff({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        role: form.role,
      });

      if (!result.ok) {
        setNotice(result.error ?? 'Failed to create staff.');
        return;
      }

      setNotice(`Created ${form.fullName.trim()} as ${BRANCH_STAFF_ROLE_LABELS[form.role]}.`);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (member: BranchStaffMember) => {
    if (!branchId) return;
    const next = member.status === 'active' ? 'inactive' : 'active';
    const { error } = await setBranchStaffStatus(member.id, next);
    if (error) {
      setNotice(`Could not update status: ${error.message}`);
      return;
    }
    setNotice(`${member.full_name} is now ${next === 'active' ? 'Active' : 'Inactive'}.`);
    await load();
  };

  return (
    <div className="page-container staff-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Manage Staff</h1>
          <p>
            {loading
              ? 'Loading staff...'
              : `Create and manage staff accounts for ${branchName || 'your branch'}.`}
          </p>
        </div>
        <div className="staff-header-actions">
          <button className="btn-primary" type="button" onClick={() => setShowForm((v) => !v)}>
            <Plus size={15} /> {showForm ? 'Close' : 'Add Staff'}
          </button>
        </div>
      </div>

      <div className="staff-summary">
        <div className="staff-summary-card">
          <span className="staff-summary-icon"><Users size={18} /></span>
          <div>
            <strong>{summary.total}</strong>
            <span>Total staff</span>
          </div>
        </div>
        <div className="staff-summary-card">
          <span className="staff-summary-icon"><UserCheck size={18} /></span>
          <div>
            <strong>{summary.active}</strong>
            <span>Active accounts</span>
          </div>
        </div>
      </div>

      {notice && <div className="staff-note">{notice}</div>}

      {showForm && (
        <div className="staff-form-card">
          <div className="staff-form-grid">
            <label>
              Full Name
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="e.g. Juan Dela Cruz"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="staff@email.com"
                autoComplete="off"
              />
            </label>
            <label>
              Temporary Password
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
                autoComplete="off"
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0917 000 0000"
              />
            </label>
            <label>
              Role
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as BranchStaffRole })
                }
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {BRANCH_STAFF_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="staff-form-actions">
            <button className="btn-secondary" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving}
            >
              {saving ? 'Creating…' : 'Create Staff Account'}
            </button>
          </div>
        </div>
      )}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {displayStaff.map((member) => (
              <tr key={member.id}>
                <td className="staff-name-cell">{member.full_name}</td>
                <td>{member.email}</td>
                <td>{BRANCH_STAFF_ROLE_LABELS[member.role]}</td>
                <td>
                  <button
                    type="button"
                    className={
                      member.status === 'active' ? 'staff-status active' : 'staff-status inactive'
                    }
                    onClick={() => void handleToggleStatus(member)}
                    disabled={usingSample}
                  >
                    {member.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="staff-muted">{member.phone || ''}</td>
              </tr>
            ))}

            {displayStaff.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="staff-muted">
                  No staff yet. Use &quot;Add Staff&quot; to create barista accounts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
