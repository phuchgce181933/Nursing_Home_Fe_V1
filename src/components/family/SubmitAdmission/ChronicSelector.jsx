import { useState } from 'react';
import { Check, X } from 'lucide-react';

const CHRONIC_SUGGESTIONS = [
  'Diabetes',
  'Hypertension',
  'Cardiovascular Disease',
  'Asthma',
  "Alzheimer's",
  "Parkinson's",
  'Chronic Kidney Disease',
  'Arthritis',
];

export default function ChronicSelector({ selected = [], onChange }) {
  const [custom, setCustom] = useState('');

  const toggle = (name) =>
    onChange(
      selected.includes(name)
        ? selected.filter((x) => x !== name)
        : [...selected, name]
    );

  const addCustom = () => {
    const v = custom.trim();
    if (v && !selected.includes(v)) onChange([...selected, v]);
    setCustom('');
  };

  return (
    <div className="sap-chronic">
      <div className="sap-chronic__chips">
        {CHRONIC_SUGGESTIONS.map((name) => (
          <button
            key={name}
            type="button"
            className={`sap-chronic__chip ${selected.includes(name) ? 'sap-chronic__chip--active' : ''}`}
            onClick={() => toggle(name)}
          >
            {selected.includes(name) && <Check size={12} />}
            {name}
          </button>
        ))}
      </div>
      {selected.filter((s) => !CHRONIC_SUGGESTIONS.includes(s)).length > 0 && (
        <div className="sap-chronic__custom-tags">
          {selected
            .filter((s) => !CHRONIC_SUGGESTIONS.includes(s))
            .map((s) => (
              <span key={s} className="sap-tag">
                {s}
                <button type="button" onClick={() => onChange(selected.filter((x) => x !== s))}>
                  <X size={12} />
                </button>
              </span>
            ))}
        </div>
      )}
      <div className="sap-chronic__add-row">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add other conditions (e.g., Alzheimer's)..."
          className="sap-input sap-chronic__add-input"
        />
        <button type="button" className="sap-btn sap-btn--outline sap-chronic__add-btn" onClick={addCustom}>
          Add
        </button>
      </div>
    </div>
  );
}
