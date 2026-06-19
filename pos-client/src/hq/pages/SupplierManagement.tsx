import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Search, Phone, Mail, MapPin, X } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { getHqDemoData, type HqSupplierRow } from '../data/getHqDemoData';
import {
  createSupplier,
  ensureSampleSuppliers,
  fetchSuppliers,
} from '../lib/supplierService';
import './SupplierManagement.css';

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

const emptyForm = {
  name: '',
  category: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  isActive: true,
};

export default function SupplierManagement() {
  const { brand } = useBrand();
  const demo = useMemo(() => getHqDemoData(brand.slug), [brand.slug]);

  const [suppliers, setSuppliers] = useState<HqSupplierRow[]>([]);
  const [query, setQuery] = useState('');
  const [errorText, setErrorText] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fromLocal, setFromLocal] = useState(false);

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

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((supplier) => {
      const fields = [
        supplier.name,
        supplier.contact_person ?? '',
        supplier.phone ?? '',
        supplier.email ?? '',
        supplier.address ?? '',
        supplier.category ?? '',
      ];
      return fields.some((field) => field.toLowerCase().includes(q));
    });
  }, [suppliers, query]);

  const updateField = <K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
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

    const result = await createSupplier({
      brandId: brand.dbBrandId,
      name: form.name,
      category: form.category,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      address: form.address,
      isActive: form.isActive,
    });

    setSaving(false);

    if (!result.ok) {
      setErrorText(result.error ?? 'Failed to add supplier.');
      return;
    }

    const savedName = form.name.trim();
    closeForm();

    if (result.savedLocally) {
      setFromLocal(true);
      setNoticeText(
        `Added ${savedName} on this device. Run supabase-supplier-setup.sql to sync with live HQ data.`
      );
    } else {
      setNoticeText(`Added ${savedName} successfully.`);
    }

    if (result.supplier) {
      setSuppliers((prev) => [result.supplier!, ...prev]);
    } else {
      await loadSuppliers({ background: true });
    }
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
            setShowForm((value) => !value);
            setErrorText('');
            setNoticeText('');
            if (showForm) {
              setForm(emptyForm);
            }
          }}
        >
          <Plus size={15} /> {showForm ? 'Close' : 'Add Supplier'}
        </button>
      </div>

      {showForm && (
        <form className="supplier-form-card" onSubmit={handleSubmit}>
          <h2>New Supplier</h2>
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
                {saving ? 'Saving...' : 'Add Supplier'}
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
              <th>Status</th>
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
                <td>
                  <span className={supplier.is_active === false ? 'supplier-status-inactive' : 'supplier-status-active'}>
                    {supplier.is_active === false ? 'Inactive' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}

            {filteredSuppliers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--text-muted)' }}>
                  No supplier records match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
