import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building, Layers, DoorOpen, Bed as BedIcon, Activity } from 'lucide-react';

/**
 * Shared header + stat cards + tab bar for the Facilities sub-pages
 * (Buildings / Floors / Rooms / Beds / Equipment). Replaces the old
 * internal `activeTab` state from the monolithic FacilitiesPage with real
 * routing via NavLink, so each tab is its own route/bundle.
 */
export default function FacilitiesSubNav({ stats, addButton }) {
  const { t } = useTranslation();

  const tabClass = ({ isActive }) => `fac-tab-btn ${isActive ? 'active' : ''}`;
  // NavLink renders an <a>; the original tab bar used <button> elements which
  // have no underline by default, so restore that here to keep styling identical.
  const tabStyle = { textDecoration: 'none' };

  return (
    <>
      {/* Banner Header */}
      <div className="fac-header">
        <div>
          <h1>{t('facilities.pageTitle')}</h1>
          <p>{t('facilities.pageSubtitle')}</p>
        </div>
        {addButton}
      </div>

      {/* Stat Cards */}
      <div className="fac-stats-grid">
        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <Building size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">{t('facilities.totalBuildings')}</span>
            <span className="fac-stat-value">{stats.buildingsCount}</span>
          </div>
        </div>

        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <Layers size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">{t('facilities.totalFloors')}</span>
            <span className="fac-stat-value">{stats.floorsCount}</span>
          </div>
        </div>

        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <DoorOpen size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">{t('facilities.totalRooms')}</span>
            <span className="fac-stat-value">{stats.roomsCount}</span>
          </div>
        </div>

        <div className="fac-stat-card">
          <div className="fac-stat-icon-wrapper">
            <BedIcon size={20} />
          </div>
          <div className="fac-stat-info">
            <span className="fac-stat-label">{t('facilities.totalBeds')}</span>
            <span className="fac-stat-value">{stats.bedsCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fac-tab-bar">
        <NavLink to="/admin/buildings" className={tabClass} style={tabStyle}>
          <Building size={16} /> {t('facilities.tabBuildings')}
        </NavLink>
        <NavLink to="/admin/floors" className={tabClass} style={tabStyle}>
          <Layers size={16} /> {t('facilities.tabFloors')}
        </NavLink>
        <NavLink to="/admin/rooms" className={tabClass} style={tabStyle}>
          <DoorOpen size={16} /> {t('facilities.tabRooms')}
        </NavLink>
        <NavLink to="/admin/beds" className={tabClass} style={tabStyle}>
          <BedIcon size={16} /> {t('facilities.tabBeds')}
        </NavLink>
        <NavLink to="/admin/equipment" className={tabClass} style={tabStyle}>
          <Activity size={16} /> {t('facilities.tabEquipment')}
        </NavLink>
      </div>
    </>
  );
}
