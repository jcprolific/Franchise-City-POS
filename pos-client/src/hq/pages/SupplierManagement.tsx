import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './SupplierManagement.css';

interface SupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

const fallbackSuppliers: SupplierRow[] = [
  {
    id: 's-001',
    name: 'Bean Origin Trading',
    contact_person: 'Miguel Santos',
    phone: '+63 917 555 0141',
    email: 'orders@beanorigin.ph',
    address: 'Makati City',
    category: 'Coffee Beans',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-002',
    name: 'Dairy Delight Co.',
    contact_person: 'Alyssa Cruz',
    phone: '+63 927 225 1188',
    email: 'sales@dairydelight.ph',
    address: 'Pasig City',
    category: 'Milk & Dairy',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-003',
    name: 'Sweet Leaf PH',
    contact_person: 'Carlo Reyes',
    phone: '+63 905 887 9012',
    email: 'partners@sweetleaf.ph',
    address: 'Quezon City',
    category: 'Syrups & Sweeteners',
    is_active: true,
    created_at: null,
  },
];

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setErrorText('');
    const { data, error } = await supabase
      .from('supplier')
      .select('id,name,contact_person,phone,email,address,category,is_active,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setSuppliers(fallbackSuppliers);
      setErrorText('Using fallback supplier list. Create `supplier` table in Supabase for live data.');
      setLoading(false);
      return;
    }

    setSuppliers((data as SupplierRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSuppliers();
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Supplier Management</h1>
          <p>Database of suppliers with complete contact details and quick lookup.</p>
        </div>
      </div>

      <div className="supplier-toolbar">
        <div className="supplier-search">
          <Search size={16} className="supplier-search-icon" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search supplier, contact person, phone, email..."
          />
        </div>
        <button className="btn-primary" type="button" onClick={() => void loadSuppliers()}>
          Refresh
        </button>
      </div>

      {errorText && <div className="supplier-note">{errorText}</div>}

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
            {loading && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--text-muted)' }}>
                  Loading supplier records...
                </td>
              </tr>
            )}

            {!loading &&
              filteredSuppliers.map((supplier) => (
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

            {!loading && filteredSuppliers.length === 0 && (
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
