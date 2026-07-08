import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  fetchOwnerBranch,
  updateOwnerBranchInfo,
  type OwnerBranchInfo,
} from './lib/branchStaffService';
import '../hq/pages/BranchManagement.css';

export default function BusinessInfoPage() {
  const [branch, setBranch] = useState<OwnerBranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setError('Not signed in.');
      setLoading(false);
      return;
    }

    const row = await fetchOwnerBranch(userId);
    if (!row) {
      setError('Your account is not linked to a branch. Contact HQ.');
      setLoading(false);
      return;
    }

    setBranch(row);
    setBusinessName(row.business_name ?? '');
    setPhone(row.franchisee_phone ?? '');
    setAddress(row.address ?? '');
    setCity(row.city ?? '');
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!branch) return;

    setSaving(true);
    setNotice('');
    setError('');

    const result = await updateOwnerBranchInfo(branch.id, {
      business_name: businessName.trim() || undefined,
      franchisee_phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? 'Failed to save.');
      return;
    }

    setNotice('Business information updated.');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Business Information</h1>
          <p>Update your branch contact and business details.</p>
        </div>
      </div>

      {loading && <div className="branch-notice">Loading...</div>}
      {notice && <div className="branch-notice">{notice}</div>}
      {error && <div className="branch-error">{error}</div>}

      {!loading && branch && (
        <form className="franchisee-form" onSubmit={handleSubmit}>
          <fieldset className="franchisee-fieldset">
            <legend>
              <Building2 size={16} style={{ display: 'inline', marginRight: 6 }} />
              Branch: {branch.name}
            </legend>
            <div className="franchisee-grid">
              <label className="franchisee-field">
                <span>Registered business name</span>
                <input
                  className="branch-input"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Santos Food Ventures Inc."
                />
              </label>
              <label className="franchisee-field">
                <span>Contact phone</span>
                <input
                  className="branch-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0917 000 0000"
                />
              </label>
              <label className="franchisee-field franchisee-field-wide">
                <span>Address</span>
                <input
                  className="branch-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, building, landmark"
                />
              </label>
              <label className="franchisee-field">
                <span>City / area</span>
                <input
                  className="branch-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Taguig City"
                />
              </label>
              <label className="franchisee-field">
                <span>Owner email (read-only)</span>
                <input
                  className="branch-input"
                  value={branch.franchisee_email ?? ''}
                  readOnly
                  disabled
                />
              </label>
              <label className="franchisee-field">
                <span>Owner name (read-only)</span>
                <input
                  className="branch-input"
                  value={branch.franchisee_name ?? ''}
                  readOnly
                  disabled
                />
              </label>
            </div>
          </fieldset>

          <div className="franchisee-form-footer">
            <div className="franchisee-form-actions">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
