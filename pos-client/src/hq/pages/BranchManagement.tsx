import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import './BranchManagement.css';

interface BranchRow {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

function branchCodeFromId(id: string) {
  return `BR-${id.slice(0, 4).toUpperCase()}`;
}

export default function BranchManagement() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadBranches = useCallback(async () => {
    setErrorText('');
    const { data, error } = await supabase
      .from('branch')
      .select('id,name,address,is_active,created_at')
      .order('created_at', { ascending: true });

    if (error) {
      setErrorText(error.message);
    } else {
      setBranches((data as BranchRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const handleAddBranch = async (e: FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchAddress.trim()) {
      setErrorText('Branch name and address are required.');
      return;
    }

    setSaving(true);
    setErrorText('');
    const { error } = await supabase.from('branch').insert({
      name: branchName.trim(),
      address: branchAddress.trim(),
      is_active: isActive,
    });

    if (error) {
      if (error.message.toLowerCase().includes('row-level security')) {
        setErrorText(
          'Branch create blocked by Supabase RLS policy. Run the branch policy SQL first.'
        );
      } else {
        setErrorText(error.message);
      }
      setSaving(false);
      return;
    }

    setBranchName('');
    setBranchAddress('');
    setIsActive(true);
    setShowForm(false);
    setSaving(false);
    await loadBranches();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Branch Management</h1>
          <p>Add, edit, and configure franchise locations</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((prev) => !prev)}>
          <span>{showForm ? 'Close' : '+ Add Branch'}</span>
        </button>
      </div>

      {showForm && (
        <form className="branch-add-form" onSubmit={handleAddBranch}>
          <input
            className="branch-input"
            placeholder="Branch name"
            value={branchName}
            onChange={(event) => setBranchName(event.target.value)}
          />
          <input
            className="branch-input"
            placeholder="Branch address"
            value={branchAddress}
            onChange={(event) => setBranchAddress(event.target.value)}
          />
          <label className="branch-checkbox-row">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active branch
          </label>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Branch'}
          </button>
        </form>
      )}

      {errorText && <div className="branch-error">{errorText}</div>}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Branch Code</th>
              <th>Name</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ color: 'var(--text-muted)' }}>
                  Loading branches...
                </td>
              </tr>
            )}
            {!loading &&
              branches.map((branch) => (
                <tr key={branch.id}>
                  <td className="branch-code-cell">{branchCodeFromId(branch.id)}</td>
                  <td>{branch.name}</td>
                  <td>{branch.address || 'No address'}</td>
                  <td>
                    <span className={branch.is_active ? 'branch-status-active' : 'branch-status-inactive'}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-primary branch-edit-btn" type="button" disabled>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && branches.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: 'var(--text-muted)' }}>
                  No branches yet. Add your first branch above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
