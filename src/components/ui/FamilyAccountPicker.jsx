import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import authService from '../../services/auth.service';
import useDebouncedSearch from '../../hooks/useDebouncedSearch';
import '../../styles/components/FamilyAccountPicker.css';

const describeAccount = (account) =>
  [account.fullName, account.phone || account.email].filter(Boolean).join(' · ');

export default function FamilyAccountPicker({ value = [], onChange }) {
  const { t } = useTranslation();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    authService
      .searchFamilyAccounts({ search: debouncedSearch.trim(), limit: 10 })
      .then((res) => {
        if (active) setResults(res?.data || []);
      })
      .catch(() => {
        if (active) setResults([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  const selectedIds = new Set(value.map((v) => v._id));

  const addAccount = (account) => {
    if (selectedIds.has(account._id)) return;
    onChange([...value, account]);
    setSearch('');
    setResults([]);
    setOpen(false);
  };

  const removeAccount = (id) => {
    onChange(value.filter((v) => v._id !== id));
  };

  return (
    <div className="family-account-picker">
      {value.length > 0 && (
        <div className="family-account-picker__chips">
          {value.map((account) => (
            <span key={account._id} className="family-account-picker__chip">
              {describeAccount(account)}
              <button type="button" onClick={() => removeAccount(account._id)} aria-label={t('common.delete')}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="family-account-picker__search">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('admin.residents.common.searchFamilyAccountPlaceholder')}
        />
        {open && (search.trim() || loading) && (
          <div className="family-account-picker__dropdown">
            {loading && <div className="family-account-picker__hint">{t('common.loading')}</div>}
            {!loading && results.length === 0 && search.trim() && (
              <div className="family-account-picker__hint">{t('common.noData')}</div>
            )}
            {!loading &&
              results.map((account) => (
                <button
                  type="button"
                  key={account._id}
                  className="family-account-picker__option"
                  disabled={selectedIds.has(account._id)}
                  onClick={() => addAccount(account)}
                >
                  {describeAccount(account)}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
