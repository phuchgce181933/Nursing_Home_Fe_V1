import '../../styles/admin/ResidentPage.css';

function ResidentPage() {
  const residents = [
    { id: 1, code: 'RES001', name: 'Cụ Nguyễn Thị D', status: 'Active' },
    { id: 2, code: 'RES002', name: 'Ông Trần Văn E', status: 'Active' },
    { id: 3, code: 'RES003', name: 'Bà Lê Thị F', status: 'Inactive' },
  ];

  return (
    <div className="resident-page">
      <div className="resident-page__header">
        <h1 className="resident-page__title">Resident Management</h1>
        <div className="resident-page__actions">
          <button className="resident-page__button resident-page__button--primary">
            + Add Resident
          </button>
        </div>
      </div>

      <div className="resident-page__table">
        <table className="resident-page__table-element">
          <thead>
            <tr className="resident-page__table-header">
              <th className="resident-page__table-cell">Code</th>
              <th className="resident-page__table-cell">Name</th>
              <th className="resident-page__table-cell">Status</th>
              <th className="resident-page__table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {residents.map((resident) => (
              <tr key={resident.id} className="resident-page__table-row">
                <td className="resident-page__table-cell">{resident.code}</td>
                <td className="resident-page__table-cell">{resident.name}</td>
                <td className="resident-page__table-cell">
                  <span
                    className={`resident-page__status ${
                      resident.status === 'Active'
                        ? 'resident-page__status--active'
                        : 'resident-page__status--inactive'
                    }`}
                  >
                    {resident.status}
                  </span>
                </td>
                <td className="resident-page__table-cell">
                  <button className="resident-page__action resident-page__action--edit">Edit</button>
                  <button className="resident-page__action resident-page__action--delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResidentPage;