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

const SAMPLE_SUPPLIERS: SupplierRow[] = [
  {
    id: 's-pc-001',
    name: 'PC Commissary',
    contact_person: 'Rica Mendoza',
    phone: '+63 917 800 1201',
    email: 'supply@potatocorner.ph',
    address: 'Laguna Technopark, Biñan, Laguna',
    category: 'Flavor Powder & Seasonings',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-002',
    name: 'McCain Philippines',
    contact_person: 'Jonas Villanueva',
    phone: '+63 2 8888 4410',
    email: 'orders.ph@mccain.com',
    address: 'Taguig City, Metro Manila',
    category: 'Frozen Fries & Potatoes',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-003',
    name: 'PackPro Packaging',
    contact_person: 'Lea Domingo',
    phone: '+63 928 441 2290',
    email: 'sales@packpro.ph',
    address: 'Caloocan City, Metro Manila',
    category: 'Cups, Lids & Paper Bags',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-004',
    name: 'Golden Fry Oils',
    contact_person: 'Marco Dela Cruz',
    phone: '+63 905 220 8844',
    email: 'distribution@goldenfry.ph',
    address: 'Muntinlupa City, Metro Manila',
    category: 'Fry Oil & Cooking Supplies',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-005',
    name: 'Bounty Fresh Food Corp.',
    contact_person: 'Hannah Soriano',
    phone: '+63 917 555 9033',
    email: 'foodservice@bountyfresh.com',
    address: 'Santa Rosa, Laguna',
    category: 'Chicken Pops & Snacks',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-006',
    name: 'Coca-Cola FEMSA',
    contact_person: 'Paolo Neri',
    phone: '+63 2 8888 1200',
    email: 'partners@coca-cola.com.ph',
    address: 'Makati City, Metro Manila',
    category: 'Beverages',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-007',
    name: 'Metro Packaging Hub',
    contact_person: 'Grace Tan',
    phone: '+63 927 118 4402',
    email: 'orders@metropackhub.ph',
    address: 'Quezon City, Metro Manila',
    category: 'Napkins & Consumables',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-008',
    name: 'ColdChain Logistics PH',
    contact_person: 'Enzo Reyes',
    phone: '+63 918 330 7711',
    email: 'dispatch@coldchain.ph',
    address: 'Parañaque City, Metro Manila',
    category: 'Cold Storage & Delivery',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-009',
    name: 'FlavorMix Ingredients',
    contact_person: 'Bianca Ortiz',
    phone: '+63 906 771 0028',
    email: 'procurement@flavormix.ph',
    address: 'Cebu City, Cebu',
    category: 'Specialty Seasonings',
    is_active: false,
    created_at: null,
  },
  {
    id: 's-pc-010',
    name: 'Eastwood City Mall Admin',
    contact_person: 'Ronald Aquino',
    phone: '+63 2 709 0888',
    email: 'tenancy@eastwoodcity.com',
    address: 'Eastwood City, Quezon City',
    category: 'Mall Operations',
    is_active: true,
    created_at: null,
  },
];

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const loadSuppliers = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;
    if (!background) {
      setErrorText('');
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('supplier')
        .select('id,name,contact_person,phone,email,address,category,is_active,created_at')
        .order('created_at', { ascending: false });

      if (error) {
        if (!background) {
          setErrorText('Using sample supplier list. Connect Supabase `supplier` table for live data.');
        }
      } else if ((data?.length ?? 0) > 0) {
        setSuppliers(data as SupplierRow[]);
        setErrorText('');
      }
    } catch {
      if (!background) {
        setErrorText('Failed to sync suppliers. Showing sample supplier list.');
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void loadSuppliers({ background: true });
  }, [loadSuppliers]);

  const displaySuppliers = suppliers.length > 0 ? suppliers : SAMPLE_SUPPLIERS;
  const usingSampleData = suppliers.length === 0;

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displaySuppliers;
    return displaySuppliers.filter((supplier) => {
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
  }, [displaySuppliers, query]);

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
        <button className="btn-primary" type="button" onClick={() => void loadSuppliers()} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {usingSampleData && (
        <div className="supplier-note">
          Showing sample supplier records for Potato Corner network operations.
        </div>
      )}
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
