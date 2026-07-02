import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  X,
  Building2,
  CheckCircle2,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { getHqDemoData, type HqSupplierRow } from '../data/getHqDemoData';
import {
  createSupplier,
  deleteSupplier,
  ensureSampleSuppliers,
  fetchSuppliers,
  updateSupplier,
} from '../lib/supplierService';
import './SupplierManagement.css';

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function supplierBalance(supplier: HqSupplierRow): number {
  return typeof supplier.outstanding_balance === 'number'
    ? supplier.outstanding_balance
    : 0;
}

const SUPPLIER_CATEGORIES = [
  'Tea Leaves & Base Ingredients',
  'Espresso Beans & Coffee',
  'Tapioca Pearls & Boba',
  'Syrups & Flavorings',
  'Milk & Dairy',
  'Cups, Lids & Packaging',
  'Cold Storage & Delivery',
  'Mall Operations',
  'General',
];

const CREDIT_TERMS = ['COD', 'Net 7', 'Net 15', 'Net 30', 'Net 60'];

const emptyForm = {
  name: '',
  category: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  isActive: true,
  outstandingBalance: '',
  creditTerms: '',
};

export default function SupplierManagement() {
  const { brand } = useBrand();
  const demo = useMemo(() => getHqDemoData(brand.slug), [brand.slug]);

  const [suppliers, setSuppliers] = useState<HqSupplierRow[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [balanceOnly, setBalanceOnly] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fromLocal, setFromLocal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sampleSuppliers = useMemo(
    () =>
      demo.sampleSuppliers.map((supplier) => ({
        name: supplier.name,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        category: supplier.category,
        is_active: supplier.is_active,
        outstanding_balance: supplier.outstanding_balance ?? 0,
        credit_terms: supplier.credit_terms ?? null,
      })),
    [demo.sampleSuppliers]
  );

  const loadSuppliers = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;
    if (!background) {
      setErrorText('');
    }

    const localRows = ensureSampleSuppliers(brand.dbBrandId, sampleSuppliers);
    setSuppliers(localRows);
    setFromLocal(true);

    try {
      const { rows, error, fromLocal: remoteFromLocal } = await fetchSuppliers(brand.dbBrandId);

      if (rows && rows.length > 0) {
        setSuppliers(rows);
        setFromLocal(Boolean(remoteFromLocal));
        setErrorText('');
        if (remoteFromLocal && !background) {
          setNoticeText(
            'Supplier list saved on this device. Connect Supabase to sync with live HQ data.'
          );
        }
      } else if (error) {
        if (!background) {
          setErrorText(error);
        }
        setSuppliers(localRows);
        setFromLocal(true);
      }
    } catch {
      if (!background) {
        setErrorText('Could not load suppliers.');
      }
      setSuppliers(localRows);
      setFromLocal(true);
    }
  }, [brand.dbBrandId, sampleSuppliers]);

  useEffect(() => {
    void loadSuppliers({ background: true });
  }, [loadSuppliers]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const supplier of suppliers) {
      if (supplier.category) set.add(supplier.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesSearch =
        !q ||
        [
          supplier.name,
          supplier.contact_person ?? '',
          supplier.phone ?? '',
          supplier.email ?? '',
          supplier.address ?? '',
          supplier.category ?? '',
        ].some((field) => field.toLowerCase().includes(q));

      const matchesCategory =
        categoryFilter === 'all' || supplier.category === categoryFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && supplier.is_active !== false) ||
        (statusFilter === 'inactive' && supplier.is_active === false);

      const matchesBalance = !balanceOnly || supplierBalance(supplier) > 0;

      return matchesSearch && matchesCategory && matchesStatus && matchesBalance;
    });
  }, [suppliers, query, categoryFilter, statusFilter, balanceOnly]);

  const stats = useMemo(() => {
    let active = 0;
    let totalPayables = 0;
    let withBalance = 0;
    for (const supplier of suppliers) {
      if (supplier.is_active !== false) active += 1;
      const balance = supplierBalance(supplier);
      totalPayables += balance;
      if (balance > 0) withBalance += 1;
    }
    return { total: suppliers.length, active, totalPayables, withBalance };
  }, [suppliers]);

  const hasActiveFilters =
    query.trim() !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    balanceOnly;

  const clearFilters = () => {
    setQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setBalanceOnly(false);
  };

  const updateField = <K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setErrorText('');
    setNoticeText('');
  };

  const openEditForm = (supplier: HqSupplierRow) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name ?? '',
      category: supplier.category ?? '',
      contactPerson: supplier.contact_person ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      isActive: supplier.is_active !== false,
      outstandingBalance:
        typeof supplier.outstanding_balance === 'number'
          ? String(supplier.outstanding_balance)
          : '',
      creditTerms: supplier.credit_terms ?? '',
    });
    setShowForm(true);
    setErrorText('');
    setNoticeText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setErrorText('Supplier name is required.');
      return false;
    }
    if (!form.contactPerson.trim()) {
      setErrorText('Contact person is required.');
      return false;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setErrorText('Add at least one contact detail (phone or email).');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setErrorText('');
    setNoticeText('');

    const parsedBalance = Number(form.outstandingBalance);
    const payload = {
      brandId: brand.dbBrandId,
      name: form.name,
      category: form.category,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      address: form.address,
      isActive: form.isActive,
      outstandingBalance: Number.isFinite(parsedBalance) ? parsedBalance : 0,
      creditTerms: form.creditTerms,
    };

    const savedId = editingId;
    const result = savedId
      ? await updateSupplier(savedId, payload)
      : await createSupplier(payload);

    setSaving(false);

    if (!result.ok) {
      setErrorText(result.error ?? 'Failed to save supplier.');
      return;
    }

    const savedName = form.name.trim();
    const actionLabel = savedId ? 'Updated' : 'Added';
    closeForm();

    if (result.savedLocally) {
      setFromLocal(true);
      setNoticeText(
        `${actionLabel} ${savedName} on this device. Run supabase-supplier-setup.sql to sync with live HQ data.`
      );
    } else {
      setNoticeText(`${actionLabel} ${savedName} successfully.`);
    }

    if (result.supplier) {
      const saved = result.supplier;
      if (savedId) {
        setSuppliers((prev) =>
          prev.map((row) => (row.id === savedId ? saved : row))
        );
      } else {
        setSuppliers((prev) => [saved, ...prev]);
      }
    } else {
      await loadSuppliers({ background: true });
    }
  };

  const handleDelete = async (supplier: HqSupplierRow) => {
    const confirmed = window.confirm(
      `Delete supplier "${supplier.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(supplier.id);
    setErrorText('');
    setNoticeText('');

    const result = await deleteSupplier(supplier.id, brand.dbBrandId);
    setDeletingId(null);

    if (!result.ok) {
      setErrorText(result.error ?? 'Failed to delete supplier.');
      return;
    }

    setSuppliers((prev) => prev.filter((row) => row.id !== supplier.id));
    if (editingId === supplier.id) {
      closeForm();
    }
    setNoticeText(`Deleted ${supplier.name}.`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Supplier Management</h1>
          <p>{brand.name} supplier directory with contact details and quick lookup.</p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => {
            if (showForm) {
              closeForm();
            } else {
              openCreateForm();
            }
          }}
        >
          <Plus size={15} /> {showForm && !editingId ? 'Close' : 'Add Supplier'}
        </button>
      </div>

      <div className="supplier-kpi-row">
        <article className="supplier-kpi-card">
          <span className="supplier-kpi-icon"><Building2 size={18} /></span>
          <div className="supplier-kpi-body">
            <span className="supplier-kpi-label">Total Suppliers</span>
            <span className="supplier-kpi-value">{stats.total}</span>
          </div>
        </article>
        <article className="supplier-kpi-card">
          <span className="supplier-kpi-icon supplier-kpi-icon--green"><CheckCircle2 size={18} /></span>
          <div className="supplier-kpi-body">
            <span className="supplier-kpi-label">Active</span>
            <span className="supplier-kpi-value">{stats.active}</span>
          </div>
        </article>
        <article className="supplier-kpi-card">
          <span className="supplier-kpi-icon supplier-kpi-icon--amber"><Wallet size={18} /></span>
          <div className="supplier-kpi-body">
            <span className="supplier-kpi-label">Total Payables</span>
            <span className="supplier-kpi-value">{peso.format(stats.totalPayables)}</span>
          </div>
        </article>
        <article className="supplier-kpi-card">
          <span className="supplier-kpi-icon supplier-kpi-icon--red"><AlertTriangle size={18} /></span>
          <div className="supplier-kpi-body">
            <span className="supplier-kpi-label">With Balance</span>
            <span className="supplier-kpi-value">{stats.withBalance}</span>
          </div>
        </article>
      </div>

      {showForm && (
        <form className="supplier-form-card" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Edit Supplier' : 'New Supplier'}</h2>
          <div className="supplier-form-grid">
            <label className="supplier-field">
              <span>Supplier name</span>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. PearlPro Ingredients"
              />
            </label>
            <label className="supplier-field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(event) => updateField('category', event.target.value)}
              >
                <option value="">Select category</option>
                {SUPPLIER_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="supplier-field">
              <span>Contact person</span>
              <input
                value={form.contactPerson}
                onChange={(event) => updateField('contactPerson', event.target.value)}
                placeholder="e.g. Lea Domingo"
              />
            </label>
            <label className="supplier-field">
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+63 917 000 0000"
              />
            </label>
            <label className="supplier-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="sales@supplier.ph"
              />
            </label>
            <label className="supplier-field">
              <span>Credit terms</span>
              <select
                value={form.creditTerms}
                onChange={(event) => updateField('creditTerms', event.target.value)}
              >
                <option value="">Select terms</option>
                {CREDIT_TERMS.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </label>
            <label className="supplier-field">
              <span>Outstanding balance (₱)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.outstandingBalance}
                onChange={(event) => updateField('outstandingBalance', event.target.value)}
                placeholder="0"
              />
            </label>
            <label className="supplier-field supplier-field-wide">
              <span>Address</span>
              <input
                value={form.address}
                onChange={(event) => updateField('address', event.target.value)}
                placeholder="City, region"
              />
            </label>
          </div>
          <div className="supplier-form-footer">
            <label className="supplier-checkbox-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateField('isActive', event.target.checked)}
              />
              Active supplier
            </label>
            <div className="supplier-form-actions">
              <button className="supplier-cancel-btn" type="button" onClick={closeForm}>
                <X size={14} /> Cancel
              </button>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="supplier-toolbar">
        <div className="supplier-search">
          <Search size={16} className="supplier-search-icon" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search supplier, contact person, phone, email..."
          />
        </div>

        <div className="supplier-filter-group">
          <select
            className="supplier-filter-select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="supplier-filter-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
            }
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <label className="supplier-balance-toggle">
            <input
              type="checkbox"
              checked={balanceOnly}
              onChange={(event) => setBalanceOnly(event.target.checked)}
            />
            With balance
          </label>

          {hasActiveFilters && (
            <button type="button" className="supplier-clear-filters" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

        <span className="supplier-result-count">
          {filteredSuppliers.length}{' '}
          {filteredSuppliers.length === 1 ? 'supplier' : 'suppliers'}
        </span>
      </div>

      {noticeText && <div className="supplier-note supplier-note-accent">{noticeText}</div>}
      {fromLocal && !noticeText && (
        <div className="supplier-note">{demo.demoDataMessage}</div>
      )}
      {errorText && <div className="supplier-note supplier-note-error">{errorText}</div>}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Category</th>
              <th>Contact Person</th>
              <th>Contact Details</th>
              <th>Address</th>
              <th className="supplier-payable-th">Payables</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="supplier-name-cell">{supplier.name}</td>
                <td>{supplier.category || 'General'}</td>
                <td>{supplier.contact_person || 'N/A'}</td>
                <td>
                  <div className="supplier-contact-stack">
                    <span>
                      <Phone size={12} />
                      {supplier.phone || 'No phone'}
                    </span>
                    <span>
                      <Mail size={12} />
                      {supplier.email || 'No email'}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="supplier-address">
                    <MapPin size={12} />
                    {supplier.address || 'No address'}
                  </span>
                </td>
                <td className="supplier-payable-cell">
                  <span
                    className={
                      supplierBalance(supplier) > 0
                        ? 'supplier-payable-amount supplier-payable-due'
                        : 'supplier-payable-amount'
                    }
                  >
                    {peso.format(supplierBalance(supplier))}
                  </span>
                  {supplier.credit_terms && (
                    <span className="supplier-payable-terms">{supplier.credit_terms}</span>
                  )}
                </td>
                <td>
                  <span className={supplier.is_active === false ? 'supplier-status-inactive' : 'supplier-status-active'}>
                    {supplier.is_active === false ? 'Inactive' : 'Active'}
                  </span>
                </td>
                <td>
                  <div className="supplier-action-group">
                    <button
                      type="button"
                      className="supplier-edit-btn"
                      onClick={() => openEditForm(supplier)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="supplier-delete-btn"
                      onClick={() => handleDelete(supplier)}
                      disabled={deletingId === supplier.id}
                    >
                      {deletingId === supplier.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredSuppliers.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: 'var(--text-muted)' }}>
                  No supplier records match your filters.
                  {hasActiveFilters && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="supplier-inline-link"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
