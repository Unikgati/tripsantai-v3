import React, { useEffect, useRef, useState } from 'react';
// Eagerly import react-quill so the rich editor is available immediately.
// This increases bundle size but removes the textarea fallback and provides
// consistent behaviour (no flash of plain textarea).
import ReactQuill from 'react-quill';

interface ItineraryEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
}

export const ItineraryEditor: React.FC<ItineraryEditorProps> = ({ value, onChange, placeholder, id, required }) => {
  const [loadError, setLoadError] = useState(false);

  // Basic sanitize helper (advisory): escape when not using DOMPurify. Recommend DOMPurify in production.
  const sanitizeForPreview = (html: string) => {
    // naive: return as-is. We intentionally do not modify here; recommend using DOMPurify at render time.
    return html;
  };

  return (
    <div>
      {!loadError ? (
        <div className="itinerary-quill">
          <ReactQuill
            theme="snow"
            value={value}
            onChange={(val: any) => onChange(val ?? '')}
            placeholder={placeholder}
            modules={{ toolbar: [['bold', 'italic'], [{ list: 'ordered' }, { list: 'bullet' }], ['link']] }}
          />
        </div>
      ) : (
        // Defensive fallback only if ReactQuill fails to initialize at runtime
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          required={required}
        />
      )}

  {/* Preview removed: typing was duplicating content below the editor */}
    </div>
  );
};

export default ItineraryEditor;
