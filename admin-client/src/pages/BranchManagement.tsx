export default function BranchManagement() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Branch Management</h1>
          <p>Add, edit, and configure franchise locatons</p>
        </div>
        <button className="btn-primary">
          <span>+ Add Branch</span>
        </button>
      </div>

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
            <tr>
              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>BR-001</td>
              <td>Franchise City - Main</td>
              <td>QC, Metro Manila</td>
              <td><span style={{ color: 'var(--success)' }}>Active</span></td>
              <td><button className="btn-primary" style={{ padding: '6px 12px' }}>Edit</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
