import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import facilityService from '../../../services/facility.service';

/**
 * Shared cross-entity lookup data for the Facilities sub-pages
 * (Buildings / Floors / Rooms / Beds / Equipment).
 *
 * Every sub-page needs the aggregate `stats` (shown in the header stat
 * cards) and the `buildings` list (used either as its own table or as a
 * dropdown source). Only Floors/Rooms/Beds/Equipment additionally need the
 * `floors` list (for building->floor cascading selects); the Buildings page
 * doesn't use floors at all, so it can opt out via `withFloors: false` to
 * avoid an unnecessary request.
 */
export default function useFacilitiesData({ withFloors = true } = {}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    buildingsCount: 0,
    floorsCount: 0,
    roomsCount: 0,
    bedsCount: 0,
  });
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [loadedBuildings, loadedFloors, statsData] = await Promise.all([
        facilityService.listBuildings({ activeOnly: false }),
        withFloors ? facilityService.listFloors({ activeOnly: false }) : Promise.resolve([]),
        facilityService.getStats(),
      ]);

      setBuildings(loadedBuildings || []);
      setFloors(loadedFloors || []);

      // Use real counts from /stats endpoint
      setStats({
        buildingsCount: statsData?.buildingsCount ?? loadedBuildings?.length ?? 0,
        floorsCount: statsData?.floorsCount ?? loadedFloors?.length ?? 0,
        roomsCount: statsData?.roomsCount ?? 0,
        bedsCount: statsData?.bedsCount ?? 0,
      });

      return loadedBuildings || [];
    } catch (err) {
      console.error('Failed to load facility data:', err);
      setError(t('facilities.errorLoadFailed'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [withFloors]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    setLoading,
    error,
    stats,
    buildings,
    floors,
    refetch: fetchData,
  };
}
