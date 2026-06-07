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

interface DisplayBranch {
  id: string;
  code: string;
  name: string;
  address: string;
  is_active: boolean;
}

const SAMPLE_FRANCHISEES: DisplayBranch[] = [
  {
    id: 'sample-smc4',
    code: 'BR-SMC4',
    name: 'Potato Corner SM Cebu 4',
    address: 'SM City Cebu · Cebu',
    is_active: true,
  },
  {
    id: 'sample-smb11',
    code: 'BR-SMB11',
    name: 'Potato Corner SM Baguio 11',
    address: 'SM Baguio · Cordillera',
    is_active: true,
  },
  {
    id: 'sample-tac3',
    code: 'BR-TAC3',
    name: 'Potato Corner Tacloban 3',
    address: 'Robinsons Place Tacloban · Eastern Visayas',
    is_active: true,
  },
  {
    id: 'sample-smn3',
    code: 'BR-SMN3',
    name: 'Potato Corner SM North 3',
    address: 'SM City North EDSA · NCR',
    is_active: true,
  },
  {
    id: 'sample-naga',
    code: 'BR-NAGA',
    name: 'Potato Corner Naga',
    address: 'Ayala Malls Serin · Bicol',
    is_active: true,
  },
  {
    id: 'sample-ort',
    code: 'BR-ORT',
    name: 'Potato Corner Ortigas',
    address: 'Robinsons Galleria · Pasig City',
    is_active: false,
  },
  {
    id: 'sample-grh3',
    code: 'BR-GRH3',
    name: 'Potato Corner Greenhills 3',
    address: 'Greenhills Shopping Center · San Juan',
    is_active: false,
  },
  {
    id: 'sample-tri4',
    code: 'BR-TRI4',
    name: 'Potato Corner Trinoma 4',
    address: 'Trinoma Mall · Quezon City',
    is_active: true,
  },
  {
    id: 'sample-bat3',
    code: 'BR-BAT3',
    name: 'Potato Corner Batangas City 3',
    address: 'SM City Batangas · Batangas',
    is_active: true,
  },
  {
    id: 'sample-ewc',
    code: 'BR-EWC',
    name: 'Potato Corner Eastwood City',
    address: 'Eastwood Mall · Quezon City',
    is_active: true,
  },
];

function branchCodeFromId(id: string) {
  return `BR-${id.slice(0, 4).toUpperCase()}`;
}

function toDisplayBranch(branch: BranchRow): DisplayBranch {
  return {
    id: branch.id,
    code: branchCodeFromId(branch.id),
    name: branch.name,
    address: branch.address || 'No address',
    is_active: branch.is_active,
  };
}

export default function BranchManagement() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadBranches = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;
    if (!background) {
      setErrorText('');
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('branch')
        .select('id,name,address,is_active,created_at')
        .order('created_at', { ascending: true });

      if (error) {
        if (!background) {
          setErrorText(error.message);
        }
      } else {
        setBranches((data as BranchRow[]) ?? []);
        if ((data?.length ?? 0) > 0) {
          setErrorText('');
        }
      }
    } catch {
      if (!background) {
        setErrorText('Failed to load branches.');
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches({ background: true });
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

  const usingSampleData = branches.length === 0;
  const displayBranches = branches.length > 0
    ? branches.map(toDisplayBranch)
    : SAMPLE_FRANCHISEES;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Branch Management</h1>
          <p>Add, edit, and configure franchise locations</p>
          {syncing && branches.length > 0 && (
            <span className="branch-sync-label">Syncing latest branches…</span>
          )}
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
      {usingSampleData && (
        <div className="branch-sample-note">
          Showing sample franchise locations. Connect Supabase branches to replace this list.
        </div>
      )}

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
            {displayBranches.map((branch) => (
              <tr key={branch.id}>
                <td className="branch-code-cell">{branch.code}</td>
                <td>{branch.name}</td>
                <td>{branch.address}</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
