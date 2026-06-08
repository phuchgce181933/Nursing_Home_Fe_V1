import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Plus,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import admissionService from '../../services/admission.service';
import medicationService from '../../services/medication.service';
import paymentService from '../../services/payment.service';
import '../../styles/admin/AdminContractManagementPage.css';

const getContractStatusClass = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < now) {
    return 'contract-status-expired';
  }
  if (start <= now && end >= now) {
    return 'contract-status-active';
  }
  return 'contract-status-upcoming';
};

const getContractStatusLabel = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < now) {
    return 'expired';
  }
  if (start <= now && end >= now) {
    return 'active';
  }
  return 'upcoming';
};

const getStatusTranslation = (statusKey, t) => {
  const statusMap = {
    active: 'admin.contractManagement.statusActive',
    expired: 'admin.contractManagement.statusExpired',
    upcoming: 'admin.contractManagement.statusUpcoming',
  };
  return t(statusMap[statusKey] || statusKey);
};

const getContractStatusIcon = (startDate, endDate) => {
  const status = getContractStatusLabel(startDate, endDate);
  if (status === 'active') {
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  }
  if (status === 'expired') {
    return <XCircle className="w-5 h-5 text-red-600" />;
  }
  return <Calendar className="w-5 h-5 text-blue-600" />;
};

export default function AdminContractManagementPage() {
  const { t, i18n } = useTranslation();
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState('');
  const [renewalData, setRenewalData] = useState({
    billingPeriodStart: '',
    billingPeriodEnd: '',
    roomCost: 0,
    medicationCost: '',
    careServiceCost: 0,
    otherCost: 0,
    prescriptionId: null,
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const fetchContracts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await admissionService.adminGetAdmissionList({
        page: 1,
        limit: 1000,
        status: 'checked_in',
      });

      // Filter admissions with contracts
      const contractData = response.data
        .filter((admission) => admission.contractNumber && admission.contractStartDate && admission.contractEndDate)
        .map((admission) => ({
          id: admission._id,
          residentId: admission.residentId?._id || admission.residentId,
          residentName: admission.residentId?.fullName || admission.applicant?.fullName || 'N/A',
          contractNumber: admission.contractNumber,
          startDate: admission.contractStartDate,
          endDate: admission.contractEndDate,
          terms: admission.contractTerms,
          signedAt: admission.contractSignedAt,
          status: getContractStatusLabel(admission.contractStartDate, admission.contractEndDate),
          servicePackageName: admission.servicePackageId?.name || admission.servicePackageId?.packageCode || 'N/A',
          servicePackagePrice: admission.servicePackageId?.monthlyPrice || 0,
        }));

      setContracts(contractData);
    } catch (err) {
      setError(err.message || 'Failed to fetch contracts');
      console.error('Error fetching contracts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    let filtered = contracts;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((contract) => {
        const status = getContractStatusLabel(contract.startDate, contract.endDate);
        return status.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (contract) =>
          contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.residentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredContracts(filtered);
    setCurrentPage(1);
  }, [contracts, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const fetchPrescriptionCost = async (prescriptionId, residentId) => {
    try {
      const response = await medicationService.estimatePrescriptionCost(prescriptionId, residentId);
      const medicationCost = response.data?.medicationCost;
      if (medicationCost !== undefined && medicationCost !== null) {
        setRenewalData((prev) => ({
          ...prev,
          medicationCost,
        }));
      }
    } catch (err) {
      console.warn('Unable to estimate prescription cost:', err);
    }
  };

  const fetchActivePrescription = async (residentId) => {
    setPrescriptionLoading(true);
    setPrescriptionError('');
    setSelectedPrescription(null);
    try {
      const response = await medicationService.listPrescriptions({ residentId, status: 'ACTIVE', limit: 1 });
      const prescription = response.data?.[0] || null;
      setSelectedPrescription(prescription);
      setRenewalData((prev) => ({
        ...prev,
        prescriptionId: prescription?._id || null,
      }));
      if (prescription?._id) {
        await fetchPrescriptionCost(prescription._id, residentId);
      }
    } catch (err) {
      setPrescriptionError(err.message || t('admin.contractManagement.prescriptionLoadError'));
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const handleCreateRenewalInvoice = async (contract) => {
    setSelectedContract(contract);
    setSelectedPrescription(null);
    setPrescriptionError('');

    // Pre-fill dates based on contract end date + 1 day
    const endDate = new Date(contract.endDate);
    const nextStartDate = new Date(endDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);
    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setFullYear(nextEndDate.getFullYear() + 1); // 1 year renewal

    setRenewalData({
      billingPeriodStart: nextStartDate.toISOString().split('T')[0],
      billingPeriodEnd: nextEndDate.toISOString().split('T')[0],
      roomCost: 0,
      medicationCost: '',
      careServiceCost: contract.servicePackagePrice || 0,
      otherCost: 0,
      prescriptionId: null,
    });
    setShowRenewalModal(true);
    await fetchActivePrescription(contract.residentId);
  };

  const handleSubmitRenewalInvoice = async () => {
    if (!selectedContract) return;

    setIsCreatingInvoice(true);
    try {
      const totalAmount =
        (renewalData.roomCost || 0) +
        (renewalData.medicationCost || 0) +
        (renewalData.careServiceCost || 0) +
        (renewalData.otherCost || 0);

      const invoiceBody = {
        billingPeriodStart: renewalData.billingPeriodStart,
        billingPeriodEnd: renewalData.billingPeriodEnd,
        roomCost: renewalData.roomCost || 0,
        medicationCost: renewalData.medicationCost === '' ? undefined : renewalData.medicationCost,
        careServiceCost: renewalData.careServiceCost || 0,
        otherCost: renewalData.otherCost || 0,
        prescriptionId: renewalData.prescriptionId,
        totalAmount,
      };

      await paymentService.createInvoice(selectedContract.residentId, invoiceBody);

      alert(t('admin.contractManagement.invoiceCreatedSuccess'));
      setShowRenewalModal(false);
      setSelectedContract(null);
      setRenewalData({
        billingPeriodStart: '',
        billingPeriodEnd: '',
        roomCost: 0,
        medicationCost: '',
        careServiceCost: 0,
        otherCost: 0,
        prescriptionId: null,
      });
      await fetchContracts();
    } catch (err) {
      alert(t('admin.contractManagement.invoiceCreatedError') + (err.message || 'Unknown error'));
      console.error('Error creating invoice:', err);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-section">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="admin-page-title">{t('admin.contractManagement.title')}</h1>
            <p className="admin-page-subtitle">{t('admin.contractManagement.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Section */}
      <div className="admin-page-filters">
        <div className="filter-group search-group">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.contractManagement.searchPlaceholder')}
            className="filter-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('admin.contractManagement.allStatuses')}</option>
            <option value="active">{t('admin.contractManagement.statusActive')}</option>
            <option value="expired">{t('admin.contractManagement.statusExpired')}</option>
            <option value="upcoming">{t('admin.contractManagement.statusUpcoming')}</option>
          </select>
        </div>

        <button className="btn-icon-secondary" onClick={fetchContracts} disabled={isLoading}>
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="admin-page-table">
        {isLoading ? (
          <div className="table-loading">
            <div className="spinner" />
            <p>{t('admin.contractManagement.loadingContracts')}</p>
          </div>
        ) : paginatedContracts.length > 0 ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>{t('admin.contractManagement.colContractNumber')}</th>
                  <th>{t('admin.contractManagement.colResidentName')}</th>
                  <th>{t('admin.contractManagement.colStartDate')}</th>
                  <th>{t('admin.contractManagement.colEndDate')}</th>
                  <th>{t('admin.contractManagement.colStatus')}</th>
                  <th>{t('admin.contractManagement.colSignedDate')}</th>
                  <th>{t('admin.contractManagement.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="font-semibold">{contract.contractNumber}</td>
                    <td>{contract.residentName}</td>
                    <td>{formatDate(contract.startDate)}</td>
                    <td>{formatDate(contract.endDate)}</td>
                    <td>
                      <div className={`status-badge ${getContractStatusClass(contract.startDate, contract.endDate)}`}>
                        <div className="flex items-center gap-2">
                          {getContractStatusIcon(contract.startDate, contract.endDate)}
                          <span>{getStatusTranslation(getContractStatusLabel(contract.startDate, contract.endDate), t)}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(contract.signedAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-icon-primary" title={t('admin.contractManagement.viewDetails')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        {getContractStatusLabel(contract.startDate, contract.endDate) === 'expired' && (
                          <button
                            className="btn-icon-primary btn-create-invoice"
                            title={t('admin.contractManagement.createRenewalInvoice')}
                            onClick={() => handleCreateRenewalInvoice(contract)}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="table-pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="table-empty">
            <FileText className="w-12 h-12 text-gray-300" />
            <p>{t('admin.contractManagement.noContractsFound')}</p>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="admin-page-stats">
        <div className="stat-card">
          <h3>{t('admin.contractManagement.totalContracts')}</h3>
          <p className="stat-value">{contracts.length}</p>
        </div>
        <div className="stat-card">
          <h3>{t('admin.contractManagement.activeContracts')}</h3>
          <p className="stat-value text-green-600">
            {contracts.filter((c) => getContractStatusLabel(c.startDate, c.endDate) === 'active').length}
          </p>
        </div>
        <div className="stat-card">
          <h3>{t('admin.contractManagement.expiredContracts')}</h3>
          <p className="stat-value text-red-600">
            {contracts.filter((c) => getContractStatusLabel(c.startDate, c.endDate) === 'expired').length}
          </p>
        </div>
        <div className="stat-card">
          <h3>{t('admin.contractManagement.upcomingContracts')}</h3>
          <p className="stat-value text-blue-600">
            {contracts.filter((c) => getContractStatusLabel(c.startDate, c.endDate) === 'upcoming').length}
          </p>
        </div>
      </div>

      {/* Renewal Invoice Modal */}
      {showRenewalModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t('admin.contractManagement.renewalInvoiceTitle')}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRenewalModal(false);
                  setSelectedContract(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              {selectedContract && (
                <>
                  <div className="form-group">
                    <label>{t('admin.contractManagement.contractNumberLabel')}</label>
                    <input
                      type="text"
                      value={selectedContract.contractNumber}
                      disabled
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.residentNameLabel')}</label>
                    <input
                      type="text"
                      value={selectedContract.residentName}
                      disabled
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('admin.contractManagement.billingPeriodStart')}</label>
                      <input
                        type="date"
                        value={renewalData.billingPeriodStart}
                        onChange={(e) =>
                          setRenewalData({
                            ...renewalData,
                            billingPeriodStart: e.target.value,
                          })
                        }
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('admin.contractManagement.billingPeriodEnd')}</label>
                      <input
                        type="date"
                        value={renewalData.billingPeriodEnd}
                        onChange={(e) =>
                          setRenewalData({
                            ...renewalData,
                            billingPeriodEnd: e.target.value,
                          })
                        }
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.roomCost')}</label>
                    <input
                      type="number"
                      min="0"
                      value={renewalData.roomCost}
                      onChange={(e) =>
                        setRenewalData({
                          ...renewalData,
                          roomCost: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.medicationCost')}</label>
                    <input
                      type="number"
                      min="0"
                      value={renewalData.medicationCost}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRenewalData({
                          ...renewalData,
                          medicationCost: value === '' ? '' : Number(value),
                        });
                      }}
                      className="form-input"
                    />
                    <p className="form-note">{t('admin.contractManagement.medicationCostNote')}</p>
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.careServiceCost')}</label>
                    <input
                      type="number"
                      min="0"
                      value={renewalData.careServiceCost}
                      onChange={(e) =>
                        setRenewalData({
                          ...renewalData,
                          careServiceCost: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.otherCost')}</label>
                    <input
                      type="number"
                      min="0"
                      value={renewalData.otherCost}
                      onChange={(e) =>
                        setRenewalData({
                          ...renewalData,
                          otherCost: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('admin.contractManagement.prescriptionSectionTitle')}</label>
                    {prescriptionLoading ? (
                      <div className="prescription-loading">{t('admin.contractManagement.prescriptionLoading')}</div>
                    ) : selectedPrescription ? (
                      <div className="prescription-summary">
                        <div>{`${t('admin.contractManagement.prescriptionDoctor')}: ${selectedPrescription.doctorId?.fullName || t('admin.contractManagement.unknownDoctor')}`}</div>
                        <div>{`${t('admin.contractManagement.prescriptionDate')}: ${formatDate(selectedPrescription.prescriptionDate)}`}</div>
                        <div>{`${t('admin.contractManagement.prescriptionItems')}: ${selectedPrescription.itemsCount || selectedPrescription.items?.length || 0}`}</div>
                      </div>
                    ) : (
                      <div className="prescription-empty">{t('admin.contractManagement.noActivePrescription')}</div>
                    )}
                    {prescriptionError && (
                      <div className="prescription-error">{prescriptionError}</div>
                    )}
                  </div>

                  <div className="form-group-total">
                    <label>{t('admin.contractManagement.totalAmount')}</label>
                    <div className="total-amount">
                      {(
                        (renewalData.roomCost || 0) +
                        (renewalData.medicationCost || 0) +
                        (renewalData.careServiceCost || 0) +
                        (renewalData.otherCost || 0)
                      ).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowRenewalModal(false);
                  setSelectedContract(null);
                }}
              >
                {t('admin.contractManagement.cancelButton')}
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitRenewalInvoice}
                disabled={isCreatingInvoice}
              >
                {isCreatingInvoice ? t('admin.contractManagement.creatingInvoice') : t('admin.contractManagement.createInvoiceButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
