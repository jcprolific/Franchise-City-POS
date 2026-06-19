import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useBrand } from '../../context/BrandContext';
import { getHqDemoData, type HqDisplayBranch } from '../data/getHqDemoData';
import {
  deleteFranchisee,
  ensureSampleFranchisees,
  fetchFranchisees,
  registerFranchisee,
  updateFranchisee,
  type FranchiseeRow,
  type OnboardingStatus,
} from '../lib/franchiseeService';
import './BranchManagement.css';

const ONBOARDING_LABELS: Record<OnboardingStatus, string> = {
  onboarding: 'Onboarding',
  active: 'Operating',
  suspended: 'Suspended',
};

const FRANCHISE_PACKAGES = [
  'Kiosk',
  'In-line Store',
  'Free-standing Store',
  'Mall Cart',
];

const emptyForm = {
  branchCode: '',
  branchName: '',
  address: '',
  city: '',
  openingDate: '',
  franchiseeName: '',
  franchiseePhone: '',
  franchiseeEmail: '',
  businessName: '',
  franchisePackage: '',
  contractStartDate: '',
  onboardingStatus: 'onboarding' as OnboardingStatus,
  isActive: true,
};

function branchCodeFromId(id: string) {
  return `BR-${id.slice(0, 4).toUpperCase()}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function rowToForm(row: FranchiseeRow) {
  return {
    branchCode: row.branch_code ?? '',
    branchName: row.name,
    address: row.address ?? '',
    city: row.city ?? '',
    openingDate: row.opening_date ?? '',
    franchiseeName: row.franchisee_name ?? '',
    franchiseePhone: row.franchisee_phone ?? '',
    franchiseeEmail: row.franchisee_email ?? '',
    businessName: row.business_name ?? '',
    franchisePackage: row.franchise_package ?? '',
    contractStartDate: row.contract_start_date ?? '',
    onboardingStatus: (row.onboarding_status as OnboardingStatus) ?? 'onboarding',
    isActive: row.is_active,
  };
}

function toDisplayBranch(branch: FranchiseeRow): HqDisplayBranch {
  return {
    id: branch.id,
    code: branch.branch_code?.trim() || branchCodeFromId(branch.id),
    name: branch.name,
    address: branch.address || 'No address',
    is_active: branch.is_active,
    franchisee_name: branch.franchisee_name,
    franchisee_phone: branch.franchisee_phone,
    franchisee_email: branch.franchisee_email,
    opening_date: branch.opening_date,
    onboarding_status: branch.onboarding_status,
  };
}

export default function BranchManagement() {
  const { brand } = useBrand();
  const demo = useMemo(() => getHqDemoData(brand.slug), [brand.slug]);

  const [branches, setBranches] = useState<FranchiseeRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const updateField = <K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const openCreateForm = () => {
    if (showForm && !editingId) {
      closeForm();
      return;
    }
    resetForm();
    setErrorText('');
    setNoticeText('');
    setShowForm(true);
  };

  const sampleFranchisees = useMemo(
    () =>
      demo.sampleBranches.map((branch) => ({
        code: branch.code,
        name: branch.name,
        address: branch.address,
        is_active: branch.is_active,
        franchisee_name: branch.franchisee_name ?? null,
        franchisee_phone: branch.franchisee_phone ?? null,
        franchisee_email: branch.franchisee_email ?? null,
        opening_date: branch.opening_date ?? null,
        onboarding_status: branch.onboarding_status ?? 'active',
      })),
    [demo.sampleBranches]
  );

  const loadBranches = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;
    if (!background) {
      setErrorText('');
    }

    const localRows = ensureSampleFranchisees(brand.dbBrandId, sampleFranchisees);
    setBranches(localRows);

    setSyncing(true);
    try {
      const { rows, error, fromLocal } = await fetchFranchisees(brand.dbBrandId);

      if (rows && rows.length > 0) {
        setBranches(rows);
        setErrorText('');
        if (fromLocal && !background) {
          setNoticeText(
            'Franchisee list saved on this device. Connect Supabase to sync with live HQ data.'
          );
        }
      } else if (error) {
        if (!background) {
          setErrorText(error);
        }
        setBranches(localRows);
      }
    } finally {
      setSyncing(false);
    }
  }, [brand.dbBrandId, sampleFranchisees]);

  useEffect(() => {
    void loadBranches({ background: true });
  }, [loadBranches]);

  const validateForm = () => {
    if (!form.branchName.trim() || !form.address.trim()) {
      setErrorText('Branch name and address are required.');
      return false;
    }
    if (!form.franchiseeName.trim()) {
      setErrorText('Franchisee name is required.');
      return false;
    }
    if (!form.franchiseeEmail.trim() && !form.franchiseePhone.trim()) {
      setErrorText('Add at least one franchisee contact (email or mobile).');
      return false;
    }
    return true;
  };

  const buildInput = () => ({
    brandId: brand.dbBrandId,
    branchCode: form.branchCode,
    branchName: form.branchName,
    address: form.address,
    city: form.city,
    openingDate: form.openingDate,
    franchiseeName: form.franchiseeName,
    franchiseePhone: form.franchiseePhone,
    franchiseeEmail: form.franchiseeEmail,
    businessName: form.businessName,
    franchisePackage: form.franchisePackage,
    contractStartDate: form.contractStartDate,
    onboardingStatus: form.onboardingStatus,
    isActive: form.isActive,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setErrorText('');
    setNoticeText('');

    const input = buildInput();
    const result = editingId
      ? await updateFranchisee(editingId, input)
      : await registerFranchisee(input);

    setSaving(false);

    if (!result.ok) {
      setErrorText(result.error ?? 'Failed to save franchisee.');
      return;
    }

    const actionLabel = editingId ? 'Updated' : 'Registered';
    const savedId = editingId;
    closeForm();

    if (result.savedLocally) {
      setNoticeText(
        `${actionLabel} ${input.branchName.trim()} saved on this device. Connect Supabase to sync live HQ data.`
      );
    } else if (result.usedFallback) {
      setNoticeText(
        `${actionLabel} ${input.branchName.trim()} with core branch fields only. Run supabase-franchisee-fields.sql to save full franchisee details.`
      );
    } else {
      setNoticeText(`${actionLabel} ${input.branchName.trim()} successfully.`);
    }

    if (result.branch) {
      if (savedId) {
        setBranches((prev) =>
          prev.map((row) => (row.id === savedId ? { ...result.branch!, _local: true } : row))
        );
      } else {
        setBranches((prev) => [...prev, { ...result.branch!, _local: true }]);
      }
    } else {
      await loadBranches({ background: true });
    }
  };

  const handleEdit = (row: FranchiseeRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setShowForm(true);
    setErrorText('');
    setNoticeText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (row: FranchiseeRow) => {
    const confirmed = window.confirm(
      `Delete franchisee "${row.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(row.id);
    setErrorText('');
    setNoticeText('');

    const result = await deleteFranchisee(row.id, brand.dbBrandId, row);
    setDeletingId(null);

    if (!result.ok) {
      setErrorText(result.error ?? 'Failed to delete franchisee.');
      return;
    }

    setBranches((prev) => prev.filter((branch) => branch.id !== row.id));

    if (editingId === row.id) {
      closeForm();
    }

    setNoticeText(
      result.deletedLocally
        ? `Deleted ${row.name} locally.`
        : `Deleted ${row.name} successfully.`
    );
  };

  const tableRows = branches;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Franchisee Registration</h1>
          <p>Register and manage {brand.name} franchisee locations</p>
          {syncing && branches.length > 0 && (
            <span className="branch-sync-label">Syncing latest franchisees…</span>
          )}
        </div>
        <button className="btn-primary" type="button" onClick={openCreateForm}>
          <span>{showForm && !editingId ? 'Close' : '+ Register Franchisee'}</span>
        </button>
      </div>

      {showForm && (
        <form className="franchisee-form" onSubmit={handleSubmit}>
          <div className="franchisee-form-heading">
            <h2>{editingId ? 'Edit Franchisee' : 'New Franchisee'}</h2>
            {editingId && (
              <button className="btn-secondary branch-cancel-btn" type="button" onClick={closeForm}>
                Cancel edit
              </button>
            )}
          </div>

          <fieldset className="franchisee-fieldset">
            <legend>Branch details</legend>
            <div className="franchisee-grid">
              <label className="franchisee-field">
                <span>Branch code</span>
                <input
                  className="branch-input"
                  placeholder="e.g. BR-BGC"
                  value={form.branchCode}
                  onChange={(e) => updateField('branchCode', e.target.value)}
                />
              </label>
              <label className="franchisee-field">
                <span>Branch / trade name *</span>
                <input
                  className="branch-input"
                  placeholder="e.g. Coftea BGC Central"
                  value={form.branchName}
                  onChange={(e) => updateField('branchName', e.target.value)}
                />
              </label>
              <label className="franchisee-field franchisee-field-wide">
                <span>Full address *</span>
                <input
                  className="branch-input"
                  placeholder="Street, building, landmark"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </label>
              <label className="franchisee-field">
                <span>City / area</span>
                <input
                  className="branch-input"
                  placeholder="e.g. Taguig City"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </label>
              <label className="franchisee-field">
                <span>Target opening date</span>
                <input
                  className="branch-input"
                  type="date"
                  value={form.openingDate}
                  onChange={(e) => updateField('openingDate', e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="franchisee-fieldset">
            <legend>Franchisee owner</legend>
            <div className="franchisee-grid">
              <label className="franchisee-field">
                <span>Owner full name *</span>
                <input
                  className="branch-input"
                  placeholder="e.g. Maria Santos"
                  value={form.franchiseeName}
                  onChange={(e) => updateField('franchiseeName', e.target.value)}
                />
              </label>
              <label className="franchisee-field">
                <span>Mobile number</span>
                <input
                  className="branch-input"
                  placeholder="0917 000 0000"
                  value={form.franchiseePhone}
                  onChange={(e) => updateField('franchiseePhone', e.target.value)}
                />
              </label>
              <label className="franchisee-field">
                <span>Email address</span>
                <input
                  className="branch-input"
                  type="email"
                  placeholder="owner@email.com"
                  value={form.franchiseeEmail}
                  onChange={(e) => updateField('franchiseeEmail', e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="franchisee-fieldset">
            <legend>Business & contract</legend>
            <div className="franchisee-grid">
              <label className="franchisee-field">
                <span>Registered business name</span>
                <input
                  className="branch-input"
                  placeholder="e.g. Santos Food Ventures Inc."
                  value={form.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                />
              </label>
              <label className="franchisee-field">
                <span>Franchise package</span>
                <select
                  className="branch-input"
                  value={form.franchisePackage}
                  onChange={(e) => updateField('franchisePackage', e.target.value)}
                >
                  <option value="">Select package</option>
                  {FRANCHISE_PACKAGES.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </label>
              <label className="franchisee-field">
                <span>Contract start date</span>
                <input
                  className="branch-input"
                  type="date"
                  value={form.contractStartDate}
                  onChange={(e) => updateField('contractStartDate', e.target.value)}
                />
              </label>
              <label className="franchisee-field">
                <span>Onboarding stage</span>
                <select
                  className="branch-input"
                  value={form.onboardingStatus}
                  onChange={(e) =>
                    updateField('onboardingStatus', e.target.value as OnboardingStatus)
                  }
                >
                  {(Object.keys(ONBOARDING_LABELS) as OnboardingStatus[]).map((key) => (
                    <option key={key} value={key}>
                      {ONBOARDING_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <div className="franchisee-form-footer">
            <label className="branch-checkbox-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
              />
              Branch operational (POS active)
            </label>
            <div className="franchisee-form-actions">
              <button className="btn-secondary branch-cancel-btn" type="button" onClick={closeForm}>
                Cancel
              </button>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Save Changes'
                    : 'Register Franchisee'}
              </button>
            </div>
          </div>
        </form>
      )}

      {noticeText && <div className="branch-notice">{noticeText}</div>}
      {errorText && <div className="branch-error">{errorText}</div>}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Branch Code</th>
              <th>Branch</th>
              <th>Franchisee</th>
              <th>Location</th>
              <th>Opening</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={7} className="branch-empty-cell">
                  No franchisees yet. Click <strong>+ Register Franchisee</strong> to add one.
                </td>
              </tr>
            )}
            {tableRows.map((branch) => {
              const display = toDisplayBranch(branch);
              const isDeleting = deletingId === branch.id;

              return (
                <tr key={branch.id}>
                  <td className="branch-code-cell">{display.code}</td>
                  <td>{display.name}</td>
                  <td>
                    <div className="branch-owner-cell">
                      <span className="branch-owner-name">
                        {display.franchisee_name || '—'}
                      </span>
                      {(display.franchisee_phone || display.franchisee_email) && (
                        <span className="branch-owner-contact">
                          {display.franchisee_phone || display.franchisee_email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{display.address}</td>
                  <td>{formatDate(display.opening_date)}</td>
                  <td>
                    <span
                      className={
                        display.is_active ? 'branch-status-active' : 'branch-status-inactive'
                      }
                    >
                      {display.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {display.onboarding_status &&
                      display.onboarding_status !== 'active' && (
                        <span className="branch-stage-badge">
                          {ONBOARDING_LABELS[display.onboarding_status as OnboardingStatus] ??
                            display.onboarding_status}
                        </span>
                      )}
                  </td>
                  <td>
                    <div className="branch-action-group">
                      <button
                        className="btn-primary branch-edit-btn"
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleEdit(branch)}
                      >
                        Edit
                      </button>
                      <button
                        className="branch-delete-btn"
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleDelete(branch)}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
