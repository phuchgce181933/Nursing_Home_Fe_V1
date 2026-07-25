import { useState, useRef } from 'react';
import { X } from 'lucide-react';

export default function TagInput({ tags = [], onRemove, onAdd, placeholder, maxTags = 20, maxTagLength = 50 }) {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);
  const limitReached = tags.length >= maxTags;

  const commit = () => {
    const trimmed = val.trim().slice(0, maxTagLength);
    if (trimmed && !tags.includes(trimmed) && !limitReached) {
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
          <button type="button" onClick={() => onRemove(t)} aria-label={`Remove ${t}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value.slice(0, maxTagLength))}
        onKeyDown={handleKey}
        onBlur={commit}
        disabled={limitReached}
        placeholder={limitReached ? `Đã đạt tối đa ${maxTags} mục` : tags.length === 0 ? placeholder : ''}
        className="sap-tag-input__field"
      />
    </div>
  );
}
