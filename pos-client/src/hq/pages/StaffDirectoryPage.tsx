import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Users, UserCheck, Store } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import {
  ROLE_LABELS,
  createStaffUser,
  fetchActiveBranches,
  fetchStaff,
  setStaffStatus,
  type StaffBranchOption,
  type StaffMember,
  type StaffRole,
} from '../lib/staffAccessService';
import './StaffDirectoryPage.css';

const ROLE_OPTIONS: StaffRole[] = ['cashier', 'manager', 'supervisor', 'inventory_staff'];

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  branchId: '',
  role: 'cashier' as StaffRole,
};

function buildSampleStaff(): StaffMember[] {
  return [
    {
      id: 'sample-1',
      auth_user_id: null,
      brand_id: 'sample',
      branch_id: null,
      branch_name: 'BGC Central',
      full_name: 'Maria Santos',
      email: 'maria.bgc@coftea.com',
      phone: '0917 555 0101',
      role: 'manager',
      status: 'active',
      created_by: null,
      account_level: 'staff',
      last_login_at: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sample-2',
      auth_user_id: null,
      brand_id: 'sample',
      branch_id: null,
      branch_name: 'BGC Central',
      full_name: 'Jude Ramirez',
      email: 'jude.bgc@coftea.com',
      phone: '0917 555 0102',
      role: 'cashier',
      status: 'active',
      created_by: null,
      account_level: 'staff',
      last_login_at: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sample-3',
      auth_user_id: null,
      brand_id: 'sample',
      branch_id: null,
      branch_name: 'Makati Hub',
      full_name: 'Ana Cruz',
      email: 'ana.makati@coftea.com',
      phone: '0917 555 0103',
      role: 'cashier',
      status: 'inactive',
      created_by: null,
      account_level: 'staff',
      last_login_at: null,
      created_at: new Date().toISOString(),
    },
  ];
}

export default function StaffDirectoryPage() {
  const { brand } = useBrand();

  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [branches, setBranches] = useState<StaffBranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [tableReady, setTableReady] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [staffRows, branchOptions] = await Promise.all([
        fetchStaff(brand.dbBrandId),
        fetchActiveBranches(brand.dbBrandId),
      ]);

      setBranches(branchOptions);

      if (staffRows === null) {
        setStaff(null);
        setTableReady(false);
      } else {
        setStaff(staffRows);
        setTableReady(true);
      }
    } catch {
      setStaff(null);
      setTableReady(false);
    } finally {
      setLoading(false);
    }
  }, [brand.dbBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sampleStaff = useMemo(() => buildSampleStaff(), []);
  const displayStaff = staff ?? sampleStaff;
  const usingSample = staff === null;

  const summary = useMemo(() => {
    const total = displayStaff.length;
    const activePos = displayStaff.filter((s) => s.status === 'active').length;
    const branchSet = new Set(
      displayStaff.map((s) => s.branch_name ?? s.branch_id ?? 'unassigned')
    );
    return { total, activePos, branches: branchSet.size };
  }, [displayStaff]);

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim() || form.password.length < 6) {
      setNotice('Full name, email, and a password of at least 6 characters are required.');
      return;
    }
    setSaving(true);
    setNotice('');
    const result = await createStaffUser({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim() || null,
      brandId: brand.dbBrandId,
      branchId: form.branchId || null,
      role: form.role,
    });
    setSaving(false);

    if (!result.ok) {
      setNotice(result.error ?? 'Failed to create staff access.');
      return;
    }

    setNotice(`Created POS access for ${form.fullName.trim()}.`);
    setForm(emptyForm);
    setShowForm(false);
    await load();
  };

  const handleToggleStatus = async (member: StaffMember) => {
    if (usingSample) return;
    const next = member.status === 'active' ? 'inactive' : 'active';
    const { error } = await setStaffStatus(member.id, next);
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
          <h1>Staff Directory</h1>
          <p>
            {loading
              ? `Loading ${brand.name} staff access...`
              : `Manage ${brand.name} franchisee POS access.`}
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
            <strong>{summary.activePos}</strong>
            <span>Active POS users</span>
          </div>
        </div>
        <div className="staff-summary-card">
          <span className="staff-summary-icon"><Store size={18} /></span>
          <div>
            <strong>{summary.branches}</strong>
            <span>Branches covered</span>
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
                placeholder="e.g. Maria Santos"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="staff@coftea.com"
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
              Branch
              <select
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Role
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {branches.length === 0 && (
            <p className="staff-form-hint">
              No branches found for {brand.name}. Add a branch in Branch Management to assign staff to a
              location.
            </p>
          )}
          <div className="staff-form-actions">
            <button className="btn-secondary" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn-primary" type="button" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? 'Creating...' : 'Create POS Access'}
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
              <th>Branch</th>
              <th>Role</th>
              <th>Created By</th>
              <th>Status</th>
              <th>Last Login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayStaff.map((member) => (
              <tr key={member.id}>
                <td className="staff-name-cell">{member.full_name}</td>
                <td>{member.email}</td>
                <td>{member.branch_name || 'Unassigned'}</td>
                <td>{ROLE_LABELS[member.role]}</td>
                <td className="staff-muted">
                  {member.created_by ? 'Owner' : 'HQ'}
                </td>
                <td>
                  <button
                    type="button"
                    className={member.status === 'active' ? 'staff-status active' : 'staff-status inactive'}
                    onClick={() => void handleToggleStatus(member)}
                    disabled={usingSample}
                  >
                    {member.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="staff-muted">
                  {member.last_login_at
                    ? new Date(member.last_login_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="staff-muted">{member.phone || ''}</td>
              </tr>
            ))}

            {displayStaff.length === 0 && (
              <tr>
                <td colSpan={8} className="staff-muted">
                  {tableReady
                    ? 'No staff yet. Use "Add Staff" to create POS access.'
                    : 'Staff table not detected. Run the setup SQL to start managing access.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
