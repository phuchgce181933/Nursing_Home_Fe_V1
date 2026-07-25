import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import facilityService from '../../../../services/facility.service';
import ListPagination from '../../../../components/ui/ListPagination';
import { floorLabel } from '../../../../components/facility/FloorRoomSelect';
import { canAssignAreas, canAssignResidents } from '../../../../utils/staffAssignable';
import { isStaffOnLeaveForAssignment } from '../../../../utils/leaveUtils';
import { getAssignmentBasePath, roleLabel } from './assignmentHelpers';
import {
  AssignmentSelectIconButton,
  AssignmentViewIconButton,
  NonAssignableBadge,
  ShiftSummaryBadge,
} from './assignmentShared';
import AssignedResidentsViewModal from './AssignedResidentsViewModal';

export function AreaTab({ staff, loading, assignmentDate, displayNow, staffPagination, basePath }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [floors, setFloors] = useState([]);

  useEffect(() => {
    facilityService
      .listFloors({ activeOnly: true })
      .then((data) => setFloors(Array.isArray(data) ? data : []))
      .catch(() => setFloors([]));
  }, []);

  const floorLabelMap = useMemo(
    () => Object.fromEntries(floors.map((f) => [f._id, floorLabel(f)])),
    [floors]
  );

  const resolveAreaLabel = (area) => {
    if (typeof area === 'object' && area !== null) {
      return floorLabel(area);
    }
    return floorLabelMap[area] || area;
  };

  const goToDetail = (s) => {
    if (!canAssignAreas(s) || isStaffOnLeaveForAssignment(s) || !s.staffProfile) return;
    navigate(`${basePath}/area/${s._id}?date=${assignmentDate}`);
  };

  return (
    <div className="data-table-wrap assignment-table-wrap">
      <table className="data-table assignment-table">
        <colgroup>
          <col className="assignment-col assignment-col--name" />
          <col className="assignment-col assignment-col--role" />
          <col className="assignment-col assignment-col--shift" />
          <col className="assignment-col assignment-col--area" />
          <col className="assignment-col assignment-col--action" />
        </colgroup>
        <thead>
          <tr>
            <th>{t('admin.staff.assignments.area.colStaff')}</th>
            <th title={t('admin.staff.assignments.area.colRole')}>{t('admin.staff.assignments.area.colRole')}</th>
            <th title={t('admin.staff.assignments.area.colShift')}>{t('admin.staff.assignments.area.colShift')}</th>
            <th title={t('admin.staff.assignments.area.colArea')}>{t('admin.staff.assignments.area.colArea')}</th>
            <th aria-label={t('common.colActions')} />
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} className="empty-state">
                {t('admin.staff.assignments.area.loading')}
              </td>
            </tr>
          )}
          {!loading && staff.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-state">
                {t('admin.staff.assignments.area.emptyStaff')}
              </td>
            </tr>
          )}
          {!loading &&
            staff.map((s) => {
              const areas = s.staffProfile?.responsibleAreaIds || [];
              return (
                <tr
                  key={s._id}
                  className="ar-table-row--clickable"
                  onClick={() => goToDetail(s)}
                >
                  <td className="assignment-table__cell--name">{s.fullName}</td>
                  <td>{roleLabel(t, s.role)}</td>
                  <td className="assignment-table__cell--badges">
                    <ShiftSummaryBadge
                      summary={s.shiftSummary}
                      assignmentDate={assignmentDate}
                      displayNow={displayNow}
                      assignable={canAssignAreas(s)}
                    />
                  </td>
                  <td className="assignment-table__cell--badges">
                    {areas.length ? (
                      <div className="assignment-cell-badges">
                        {areas.map((a) => (
                          <span key={typeof a === 'object' ? a._id : a} className="area-badge">
                            {resolveAreaLabel(a)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="assignment-table__empty">
                        {t('admin.staff.assignments.badges.notAssigned')}
                      </span>
                    )}
                  </td>
                  <td className="assignment-table__cell--actions resident-action-cell" onClick={(e) => e.stopPropagation()}>
                    {canAssignAreas(s) ? (
                      !isStaffOnLeaveForAssignment(s) && (
                        <div className="resident-action-group assignment-action-group">
                          <AssignmentSelectIconButton
                            title={
                              !s.staffProfile
                                ? t('admin.staff.assignments.area.noProfile')
                                : t('admin.staff.assignments.area.selectStaff')
                            }
                            onClick={() => goToDetail(s)}
                            disabled={!s.staffProfile}
                          />
                        </div>
                      )
                    ) : (
                      <NonAssignableBadge />
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      {!loading && staff.length > 0 && staffPagination && (
        <ListPagination
          page={staffPagination.page}
          totalPages={staffPagination.totalPages}
          total={staffPagination.total}
          onPageChange={staffPagination.onPageChange}
        />
      )}
    </div>
  );
}

export function ResidentTab({ staff, loading, assignmentDate, displayNow, staffPagination, basePath }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [viewStaff, setViewStaff] = useState(null);

  const goToDetail = (s) => {
    if (!canAssignResidents(s) || isStaffOnLeaveForAssignment(s) || !s.staffProfile) return;
    navigate(`${basePath}/residents/${s._id}?date=${assignmentDate}`);
  };

  const openViewDetail = (s, e) => {
    e?.stopPropagation();
    const residents = s.staffProfile?.assignedResidentIds || [];
    if (!residents.length) return;
    setViewStaff(s);
  };

  return (
    <>
    <div className="data-table-wrap assignment-table-wrap">
      <table className="data-table assignment-table">
        <colgroup>
          <col className="assignment-col assignment-col--name" />
          <col className="assignment-col assignment-col--role" />
          <col className="assignment-col assignment-col--shift" />
          <col className="assignment-col assignment-col--area" />
          <col className="assignment-col assignment-col--action" />
        </colgroup>
        <thead>
          <tr>
            <th>{t('admin.staff.assignments.area.colStaff')}</th>
            <th title={t('admin.staff.assignments.area.colRole')}>{t('admin.staff.assignments.area.colRole')}</th>
            <th title={t('admin.staff.assignments.area.colShift')}>{t('admin.staff.assignments.area.colShift')}</th>
            <th title={t('admin.staff.assignments.residents.colResidents')}>
              {t('admin.staff.assignments.residents.colResidents')}
            </th>
            <th aria-label={t('common.colActions')} />
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} className="empty-state">
                {t('admin.staff.assignments.area.loading')}
              </td>
            </tr>
          )}
          {!loading && staff.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-state">
                {t('admin.staff.assignments.area.emptyStaff')}
              </td>
            </tr>
          )}
          {!loading &&
            staff.map((s) => {
              const residents = s.staffProfile?.assignedResidentIds || [];
              return (
                <tr
                  key={s._id}
                  className="ar-table-row--clickable"
                  onClick={() => goToDetail(s)}
                >
                  <td className="assignment-table__cell--name">{s.fullName}</td>
                  <td>{roleLabel(t, s.role)}</td>
                  <td className="assignment-table__cell--badges">
                    <ShiftSummaryBadge
                      summary={s.shiftSummary}
                      assignmentDate={assignmentDate}
                      displayNow={displayNow}
                      assignable={canAssignResidents(s)}
                    />
                  </td>
                  <td onClick={(e) => residents.length && e.stopPropagation()}>
                    {residents.length ? (
                      <button
                        type="button"
                        className="assignment-table__count-btn"
                        onClick={(e) => openViewDetail(s, e)}
                        title={t('admin.staff.assignments.residents.viewDetail')}
                      >
                        {t('admin.staff.assignments.residents.residentCount', { count: residents.length })}
                      </button>
                    ) : (
                      <span className="assignment-table__empty">
                        {t('admin.staff.assignments.residents.notAssigned')}
                      </span>
                    )}
                  </td>
                  <td className="assignment-table__cell--actions resident-action-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="resident-action-group assignment-action-group">
                      {residents.length > 0 && (
                        <AssignmentViewIconButton
                          title={t('admin.staff.assignments.residents.viewDetail')}
                          onClick={(e) => openViewDetail(s, e)}
                        />
                      )}
                      {canAssignResidents(s) && !isStaffOnLeaveForAssignment(s) && (
                        <AssignmentSelectIconButton
                          title={
                            !s.staffProfile
                              ? t('admin.staff.assignments.area.noProfile')
                              : t('admin.staff.assignments.area.selectStaff')
                          }
                          onClick={() => goToDetail(s)}
                          disabled={!s.staffProfile}
                        />
                      )}
                      {!canAssignResidents(s) && residents.length === 0 && (
                        <NonAssignableBadge />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      {!loading && staff.length > 0 && staffPagination && (
        <ListPagination
          page={staffPagination.page}
          totalPages={staffPagination.totalPages}
          total={staffPagination.total}
          onPageChange={staffPagination.onPageChange}
        />
      )}
    </div>
    <AssignedResidentsViewModal staff={viewStaff} onClose={() => setViewStaff(null)} />
    </>
  );
}