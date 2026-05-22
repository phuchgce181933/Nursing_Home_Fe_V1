import { useState, useRef } from 'react';
import { X } from 'lucide-react';

export default function TagInput({ tags = [], onRemove, onAdd, placeholder }) {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
    }
    setVal('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Backspace' && !val && tags.length) {
      onRemove(tags[tags.length - 1]);
    }
  };

  return (
    <div className="sap-tag-input" onClick={() => inputRef.current?.focus()}>
      {tags.map((t) => (
        <span key={t} className="sap-tag">
          {t}
          <button type="button" onClick={() => onRemove(t)} aria-label={`Xóa ${t}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={handleKey}
        onBlur={commit}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="sap-tag-input__field"
      />
    </div>
  );
}
