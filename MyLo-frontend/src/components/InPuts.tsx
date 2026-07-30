import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';

interface InPutsProps {
  label?: string;
  name?: string;
  value: string;
  type?: string;
  placeholder?: string;
  error?: string;
  onChange: (e: React.ChangeEvent<any>) => void;
  className?: string;
  textarea?: boolean;
  rows?: number;
  disabled?: boolean;
}

const InPuts: React.FC<InPutsProps> = ({
  label,
  name,
  value,
  type = 'text',
  placeholder,
  error,
  onChange,
  className = '',
  textarea = false,
  rows = 3,
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {textarea ? (
        <TextareaAutosize
          id={name}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          className={`block w-full px-3 py-2 rounded-md border border-primary-800/20 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-800 sm:text-sm ${className}`}
          minRows={rows}
          aria-invalid={!!error}
        />
      ) : (
        <input
          id={name}
          name={name}
          value={value}
          type={type}
          placeholder={placeholder}
          onChange={onChange}
          className={`block w-full px-3 py-2 rounded-md border border-primary-800/20 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-800 sm:text-sm ${className}`}
          aria-invalid={!!error}
        />
      )}
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
};

export default InPuts;
