import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Search, Building2, CheckCircle2, Hammer, Ban, ArrowUpDown, UserPlus, ArrowRightLeft } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { getHqDemoData, type HqDisplayBranch } from '../data/getHqDemoData';
import {
  deleteFranchisee,
  ensureSampleFranchisees,
  fetchFranchisees,
  getOnboardingLabel,
  isOnboardingPipelineStatus,
  ONBOARDING_LABELS,
  ONBOARDING_OPERATIONAL_STATUSES,
  ONBOARDING_PIPELINE_STAGES,
  registerFranchisee,
  updateFranchisee,
  type FranchiseeRow,
  type OnboardingStatus,
} from '../lib/franchiseeService';
import {
  createOwnerTransferRequest,
  fetchOwnerTransferRequests,
  processOwnerTransfer,
  provisionFranchiseOwner,
  type OwnerTransferRequest,
} from '../lib/franchiseOwnerService';
import './BranchManagement.css';

type SortKey = 'code' | 'name' | 'franchisee' | 'opening' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';
type StageFilter = 'all' | OnboardingStatus;

const ALL_STAGES: OnboardingStatus[] = [
  ...ONBOARDING_PIPELINE_STAGES,
  ...ONBOARDING_OPERATIONAL_STATUSES,
];

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

function parseOnboardingStatus(value: string | null | undefined): OnboardingStatus {
  if (value && value in ONBOARDING_LABELS) {
    return value as OnboardingStatus;
  }
  return 'onboarding';
}

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
    onboardingStatus: parseOnboardingStatus(row.onboarding_status),
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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [ownerPassword, setOwnerPassword] = useState('');
  const [provisioningOwner, setProvisioningOwner] = useState(false);
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferDocs, setTransferDocs] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferFullName, setTransferFullName] = useState('');
  const [transferRequests, setTransferRequests] = useState<OwnerTransferRequest[]>([]);
  const [processingTransferId, setProcessingTransferId] = useState<string | null>(null);

  const editingBranch = useMemo(
    () => (editingId ? branches.find((b) => b.id === editingId) ?? null : null),
    [editingId, branches]
  );

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

  const loadTransferRequests = useCallback(async (branchId?: string) => {
    const rows = await fetchOwnerTransferRequests(branchId);
    setTransferRequests(rows);
  }, []);

  useEffect(() => {
    if (editingId) {
      void loadTransferRequests(editingId);
    }
  }, [editingId, loadTransferRequests]);

  const handleProvisionOwner = async () => {
    if (!editingId || !editingBranch) return;
    if (!form.franchiseeEmail.trim()) {
      setErrorText('Owner email is required to create an account.');
      return;
    }
    if (ownerPassword.length < 6) {
      setErrorText('Temporary password must be at least 6 characters.');
      return;
    }
    if (editingBranch.owner_user_id) {
      setErrorText('This branch already has a registered owner. Use Transfer Ownership.');
      return;
    }

    setProvisioningOwner(true);
    setErrorText('');
    setNoticeText('');

    const result = await provisionFranchiseOwner({
      branchId: editingId,
      email: form.franchiseeEmail.trim(),
      password: ownerPassword,
      fullName: form.franchiseeName.trim(),
      brandId: brand.dbBrandId,
    });

    setProvisioningOwner(false);

    if (!result.ok) {
      setErrorText(result.error ?? 'Failed to create owner account.');
      return;
    }

    setNoticeText(`Owner account created for ${form.franchiseeEmail.trim()}. They can log in and change their password.`);
    setOwnerPassword('');
    await loadBranches({ background: true });
  };

  const handleSubmitTransferRequest = async () => {
    if (!editingId || !editingBranch) return;
    if (!transferEmail.trim()) {
      setErrorText('New owner email is required.');
      return;
    }

    const docRefs = transferDocs
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const result = await createOwnerTransferRequest({
      branchId: editingId,
      previousOwnerId: editingBranch.owner_user_id ?? null,
      newOwnerEmail: transferEmail.trim(),
      documentRefs: docRefs,
    });

    if (!result.ok) {
      setErrorText(result.error ?? 'Failed to submit transfer request.');
      return;
    }

    setNoticeText('Ownership transfer request submitted. Review and approve below.');
    setTransferEmail('');
    setTransferDocs('');
    await loadTransferRequests(editingId);
  };

  const handleProcessTransfer = async (
    request: OwnerTransferRequest,
    action: 'approve' | 'reject'
  ) => {
    setProcessingTransferId(request.id);
    setErrorText('');

    const result = await processOwnerTransfer({
      requestId: request.id,
      action,
      newOwnerPassword: action === 'approve' ? transferPassword : undefined,
      newOwnerFullName: action === 'approve' ? transferFullName || form.franchiseeName : undefined,
    });

    setProcessingTransferId(null);

    if (!result.ok) {
      setErrorText(result.error ?? 'Transfer action failed.');
      return;
    }

    setNoticeText(action === 'approve' ? 'Ownership transferred successfully.' : 'Transfer request rejected.');
    setTransferPassword('');
    setTransferFullName('');
    await loadBranches({ background: true });
    if (editingId) await loadTransferRequests(editingId);
  };

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

  const stats = useMemo(() => {
    let active = 0;
    let pipeline = 0;
    let suspended = 0;
    for (const branch of branches) {
      if (branch.is_active) active += 1;
      if (isOnboardingPipelineStatus(branch.onboarding_status)) pipeline += 1;
      if (branch.onboarding_status === 'suspended') suspended += 1;
    }
    return { total: branches.length, active, pipeline, suspended };
  }, [branches]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = branches.filter((branch) => {
      const matchesSearch =
        !q ||
        branch.name.toLowerCase().includes(q) ||
        (branch.branch_code ?? '').toLowerCase().includes(q) ||
        (branch.franchisee_name ?? '').toLowerCase().includes(q) ||
        (branch.city ?? '').toLowerCase().includes(q) ||
        (branch.address ?? '').toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && branch.is_active) ||
        (statusFilter === 'inactive' && !branch.is_active);

      const matchesStage =
        stageFilter === 'all' || branch.onboarding_status === stageFilter;

      return matchesSearch && matchesStatus && matchesStage;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      let av = '';
      let bv = '';
      switch (sortKey) {
        case 'code':
          av = a.branch_code ?? '';
          bv = b.branch_code ?? '';
          break;
        case 'franchisee':
          av = a.franchisee_name ?? '';
          bv = b.franchisee_name ?? '';
          break;
        case 'opening':
          av = a.opening_date ?? '';
          bv = b.opening_date ?? '';
          break;
        case 'status':
          av = a.is_active ? '1' : '0';
          bv = b.is_active ? '1' : '0';
          break;
        case 'name':
        default:
          av = a.name ?? '';
          bv = b.name ?? '';
          break;
      }
      return av.localeCompare(bv, undefined, { numeric: true }) * dir;
    });

    return sorted;
  }, [branches, search, statusFilter, stageFilter, sortKey, sortDir]);

  const hasActiveFilters =
    search.trim() !== '' || statusFilter !== 'all' || stageFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setStageFilter('all');
  };

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

      <div className="branch-kpi-row">
        <article className="branch-kpi-card">
          <span className="branch-kpi-icon"><Building2 size={18} /></span>
          <div className="branch-kpi-body">
            <span className="branch-kpi-label">Total Branches</span>
            <span className="branch-kpi-value">{stats.total}</span>
          </div>
        </article>
        <article className="branch-kpi-card">
          <span className="branch-kpi-icon branch-kpi-icon--green"><CheckCircle2 size={18} /></span>
          <div className="branch-kpi-body">
            <span className="branch-kpi-label">Active</span>
            <span className="branch-kpi-value">{stats.active}</span>
          </div>
        </article>
        <article className="branch-kpi-card">
          <span className="branch-kpi-icon branch-kpi-icon--amber"><Hammer size={18} /></span>
          <div className="branch-kpi-body">
            <span className="branch-kpi-label">In Pipeline</span>
            <span className="branch-kpi-value">{stats.pipeline}</span>
          </div>
        </article>
        <article className="branch-kpi-card">
          <span className="branch-kpi-icon branch-kpi-icon--red"><Ban size={18} /></span>
          <div className="branch-kpi-body">
            <span className="branch-kpi-label">Suspended</span>
            <span className="branch-kpi-value">{stats.suspended}</span>
          </div>
        </article>
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
                <span>Opening date</span>
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

          {editingId && editingBranch && (
            <fieldset className="franchisee-fieldset">
              <legend>
                <UserPlus size={16} style={{ display: 'inline', marginRight: 6 }} />
                Owner account (Level 1)
              </legend>
              {editingBranch.owner_user_id ? (
                <p className="branch-owner-status">
                  Registered owner account is active for this branch.
                </p>
              ) : (
                <div className="franchisee-grid">
                  <p className="franchisee-field-wide branch-owner-hint">
                    Create the franchise owner login using the email and name above. HQ verifies
                    identity before provisioning (OTP verification coming later).
                  </p>
                  <label className="franchisee-field">
                    <span>Temporary password *</span>
                    <input
                      className="branch-input"
                      type="text"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="off"
                    />
                  </label>
                  <div className="franchisee-field franchisee-form-actions">
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={provisioningOwner}
                      onClick={() => void handleProvisionOwner()}
                    >
                      {provisioningOwner ? 'Creating...' : 'Create Owner Account'}
                    </button>
                  </div>
                </div>
              )}

              <div className="branch-transfer-section">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowTransferPanel((v) => !v)}
                >
                  <ArrowRightLeft size={14} /> Transfer Ownership
                </button>

                {showTransferPanel && (
                  <div className="branch-transfer-panel">
                    <p className="branch-owner-hint">
                      Only HQ can change the registered owner after verifying supporting documents
                      per the Franchise Agreement.
                    </p>
                    <div className="franchisee-grid">
                      <label className="franchisee-field">
                        <span>New owner email *</span>
                        <input
                          className="branch-input"
                          type="email"
                          value={transferEmail}
                          onChange={(e) => setTransferEmail(e.target.value)}
                          placeholder="newowner@email.com"
                        />
                      </label>
                      <label className="franchisee-field franchisee-field-wide">
                        <span>Supporting documents (one per line)</span>
                        <textarea
                          className="branch-input"
                          rows={3}
                          value={transferDocs}
                          onChange={(e) => setTransferDocs(e.target.value)}
                          placeholder="Franchise Agreement addendum&#10;ID verification reference"
                        />
                      </label>
                      <div className="franchisee-field franchisee-form-actions">
                        <button
                          className="btn-primary"
                          type="button"
                          onClick={() => void handleSubmitTransferRequest()}
                        >
                          Submit Transfer Request
                        </button>
                      </div>
                    </div>

                    {transferRequests.length > 0 && (
                      <div className="branch-transfer-list">
                        <h3>Transfer requests</h3>
                        {transferRequests.map((req) => (
                          <div key={req.id} className="branch-transfer-item">
                            <div>
                              <strong>{req.new_owner_email}</strong>
                              <span className={`branch-transfer-status branch-transfer-status--${req.status}`}>
                                {req.status}
                              </span>
                              <p className="branch-owner-hint">
                                Docs: {(req.document_refs ?? []).map((d) => d.name).join(', ') || '—'}
                              </p>
                            </div>
                            {req.status === 'pending' && (
                              <div className="branch-transfer-actions">
                                <input
                                  className="branch-input"
                                  type="text"
                                  placeholder="New owner full name"
                                  value={transferFullName}
                                  onChange={(e) => setTransferFullName(e.target.value)}
                                />
                                <input
                                  className="branch-input"
                                  type="text"
                                  placeholder="Temp password (6+ chars)"
                                  value={transferPassword}
                                  onChange={(e) => setTransferPassword(e.target.value)}
                                />
                                <button
                                  className="btn-primary"
                                  type="button"
                                  disabled={processingTransferId === req.id}
                                  onClick={() => void handleProcessTransfer(req, 'approve')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-secondary"
                                  type="button"
                                  disabled={processingTransferId === req.id}
                                  onClick={() => void handleProcessTransfer(req, 'reject')}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </fieldset>
          )}

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
                  <optgroup label="Pre-opening pipeline">
                    {ONBOARDING_PIPELINE_STAGES.map((key) => (
                      <option key={key} value={key}>
                        {ONBOARDING_LABELS[key]}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Operations">
                    {ONBOARDING_OPERATIONAL_STATUSES.map((key) => (
                      <option key={key} value={key}>
                        {ONBOARDING_LABELS[key]}
                      </option>
                    ))}
                  </optgroup>
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

      <div className="branch-toolbar">
        <div className="branch-search">
          <Search size={16} className="branch-search-icon" />
          <input
            className="branch-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branch, code, franchisee, or city..."
          />
        </div>

        <div className="branch-filter-group">
          <select
            className="branch-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            className="branch-filter-select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as StageFilter)}
            aria-label="Filter by stage"
          >
            <option value="all">All Stages</option>
            {ALL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {ONBOARDING_LABELS[stage]}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button type="button" className="branch-clear-filters" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

        <span className="branch-result-count">
          {tableRows.length} {tableRows.length === 1 ? 'branch' : 'branches'}
        </span>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <button type="button" className="branch-sort-th" onClick={() => handleSort('code')}>
                  Branch Code <ArrowUpDown size={12} />
                </button>
              </th>
              <th>
                <button type="button" className="branch-sort-th" onClick={() => handleSort('name')}>
                  Branch <ArrowUpDown size={12} />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="branch-sort-th"
                  onClick={() => handleSort('franchisee')}
                >
                  Franchisee <ArrowUpDown size={12} />
                </button>
              </th>
              <th>Location</th>
              <th>
                <button
                  type="button"
                  className="branch-sort-th"
                  onClick={() => handleSort('opening')}
                >
                  Opening Date <ArrowUpDown size={12} />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="branch-sort-th"
                  onClick={() => handleSort('status')}
                >
                  Status <ArrowUpDown size={12} />
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={7} className="branch-empty-cell">
                  {hasActiveFilters ? (
                    <>
                      No branches match your filters.{' '}
                      <button type="button" className="branch-inline-link" onClick={clearFilters}>
                        Clear filters
                      </button>
                    </>
                  ) : (
                    <>
                      No franchisees yet. Click <strong>+ Register Franchisee</strong> to add one.
                    </>
                  )}
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
                          {getOnboardingLabel(display.onboarding_status)}
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
