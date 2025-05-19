import React, { useRef, useState, useEffect } from 'react';
import { IconCaretDown, IconTrash } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';
import { useSelector } from 'react-redux';
import darkTheme from 'themes/dark';
import lightTheme from 'themes/light';
import { useTheme } from 'providers/Theme';

const LOCAL_STORAGE_KEY = 'bruno_custom_http_methods';

const STANDARD_METHODS = [
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'
];

const HttpMethodSelector = ({ method, onMethodSelect }) => {
  const { storedTheme } = useTheme();
  const getMethodColor = (method = '') => {
    const theme = storedTheme === 'dark' ? darkTheme : lightTheme;
    return theme.request.methods[method.toLocaleLowerCase()] || theme.request.methods.default;
  };

  const [customMethods, setCustomMethods] = useState([]);
  const [inputValue, setInputValue] = useState(method);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const inputRef = useRef();

  // Load custom methods from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomMethods(parsed);
        }
      } catch {}
    }
  }, []);

  // Save custom methods to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customMethods));
  }, [customMethods]);

  useEffect(() => {
    setInputValue(method);
  }, [method]);

  // All methods, custom after standard
  const allMethods = [...STANDARD_METHODS, ...customMethods];
  const inputValueUpper = inputValue.trim().toUpperCase();
  // Case-insensitive check for existence
  const methodExists = allMethods.some((m) => m.toUpperCase() === inputValueUpper);
  const filteredStandard = hasTyped && inputValueUpper
    ? STANDARD_METHODS.filter((m) => m.toUpperCase().includes(inputValueUpper))
    : STANDARD_METHODS;
  const filteredCustom = hasTyped && inputValueUpper
    ? customMethods.filter((m) => m.toUpperCase().includes(inputValueUpper))
    : customMethods;
  const canAddCustom = hasTyped && inputValueUpper && !methodExists;

  // For keyboard navigation, build a flat list of all visible items
  let flatSuggestions = [];
  if (filteredStandard.length > 0) flatSuggestions = flatSuggestions.concat(filteredStandard);
  if (filteredCustom.length > 0) flatSuggestions = flatSuggestions.concat(filteredCustom);
  if (canAddCustom) flatSuggestions = [inputValueUpper, ...flatSuggestions];

  // For rendering, keep track of where dividers/labels go
  const hasCustom = filteredCustom.length > 0;
  const hasStandard = filteredStandard.length > 0;

  // Open dropdown and set highlight
  const openDropdown = () => {
    setShowDropdown(true);
    setTimeout(() => {
      if (inputRef.current && isInputFocused) inputRef.current.setSelectionRange(inputValue.length, inputValue.length);
    }, 0);
    setHighlightedIndex(flatSuggestions.findIndex((m) => m === inputValue));
  };

  // Close dropdown and reset highlight
  const closeDropdown = () => {
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    setHasTyped(false);
    setShowDropdown(true);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.select();
    }, 0);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value.toUpperCase());
    setShowDropdown(true);
    setHighlightedIndex(0);
    setHasTyped(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    setTimeout(() => {
      closeDropdown();
      const value = inputValue.trim().toUpperCase();
      if (!value) {
        setInputValue(method);
        onMethodSelect(method);
        return;
      }
      if (!allMethods.some((m) => m.toUpperCase() === value)) {
        const updated = [value, ...customMethods].slice(0, 10);
        setCustomMethods(updated);
        setInputValue(value);
        onMethodSelect(value);
      } else {
        setInputValue(value);
        onMethodSelect(value);
      }
    }, 120);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showDropdown) openDropdown();
      setHighlightedIndex((prev) => (prev < flatSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showDropdown) openDropdown();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : flatSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && highlightedIndex >= 0 && highlightedIndex < flatSuggestions.length) {
        // If add method option is highlighted
        if (canAddCustom && highlightedIndex === 0) {
          handleAddCustomMethod(inputValueUpper);
        } else {
          handleSuggestionClick(flatSuggestions[highlightedIndex]);
        }
      } else {
        const value = inputValueUpper;
        if (!value) {
          setInputValue(method);
          onMethodSelect(method);
          closeDropdown();
          return;
        }
        if (!allMethods.some((m) => m.toUpperCase() === value)) {
          handleAddCustomMethod(value);
        } else {
          setInputValue(value);
          onMethodSelect(value);
        }
        closeDropdown();
      }
    } else if (e.key === 'Escape') {
      setInputValue(method);
      onMethodSelect(method);
      closeDropdown();
    }
  };

  const handleAddCustomMethod = (value) => {
    // Prevent duplicates (case-insensitive)
    if (!customMethods.some((m) => m.toUpperCase() === value.toUpperCase()) && !STANDARD_METHODS.includes(value)) {
      const updated = [value, ...customMethods].slice(0, 10);
      setCustomMethods(updated);
    }
    setInputValue(value);
    onMethodSelect(value);
    closeDropdown();
    setHasTyped(false);
    if (inputRef.current) inputRef.current.blur();
  };

  const handleSuggestionClick = (verb) => {
    setInputValue(verb);
    onMethodSelect(verb);
    closeDropdown();
    if (inputRef.current) inputRef.current.blur();
  };

  const handleDeleteCustomMethod = (verb, e) => {
    e.stopPropagation();
    setCustomMethods(customMethods.filter((m) => m !== verb));
    if (method === verb) {
      setInputValue('GET');
      onMethodSelect('GET');
    }
  };

  // The input styled as the dropdown trigger
  const inputTrigger = (
    <div className="relative flex items-center method-selector" style={{ minWidth: 90, width: 90, maxWidth: 120 }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onFocus={handleInputFocus}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        className="px-3 py-1 uppercase custom-method-input cursor-pointer bg-transparent border-none font-medium focus:outline-none w-full"
        aria-label="HTTP method"
        autoComplete="off"
        spellCheck={false}
        style={{ minWidth: 90, width: 90, maxWidth: 120 }}
      />
      <span
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 cursor-pointer"
        tabIndex={-1}
        onMouseDown={e => {
          e.preventDefault();
          setShowDropdown(true);
          setHasTyped(false); // Show all methods when caret is clicked
        }}
        style={{ pointerEvents: 'auto' }}
      >
        <IconCaretDown className="caret" size={14} strokeWidth={2} />
      </span>
    </div>
  );

  return (
    <StyledWrapper>
      <Dropdown
        icon={inputTrigger}
        placement="bottom-start"
        transparent={false}
        onCreate={() => {}}
      >
        <div
          role="listbox"
          aria-label="HTTP method suggestions"
          style={{ minWidth: 160, maxWidth: 220, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
          className="bg-[var(--bg-color)]"
        >
          {canAddCustom && (
            <>
              <div
                role="option"
                aria-selected={highlightedIndex === 0}
                className={`dropdown-item flex items-center px-3 py-1 select-none rounded ${highlightedIndex === 0 ? 'bg-[var(--primary-color-fade)]' : ''}`}
                onMouseDown={() => handleAddCustomMethod(inputValueUpper)}
                style={{ cursor: 'pointer' }}
              >
                <span className="text-green-600 font-medium">+ Add method: </span>
                <span className="ml-1 uppercase font-medium" style={{ color: getMethodColor(inputValueUpper) }}>{inputValueUpper}</span>
              </div>
              <div className="dropdown-divider my-1" style={{ borderTop: '1px solid var(--border-color)' }}></div>
            </>
          )}
          {hasStandard && filteredStandard.map((verb, idx) => (
            <div
              key={verb}
              role="option"
              aria-selected={flatSuggestions[highlightedIndex] === verb}
              className={`dropdown-item flex items-center justify-between group px-3 py-1 select-none rounded ${flatSuggestions[highlightedIndex] === verb ? 'bg-[var(--primary-color-fade)]' : ''}`}
              onMouseDown={() => handleSuggestionClick(verb)}
              onMouseEnter={() => setHighlightedIndex(flatSuggestions.indexOf(verb))}
              style={{ cursor: 'pointer' }}
            >
              <span
                style={{ color: getMethodColor(verb) }}
                className={`uppercase font-medium flex items-center`}
              >
                {verb}
                {method.toUpperCase() === verb && (
                  <span className="ml-2" aria-label="selected">✓</span>
                )}
              </span>
            </div>
          ))}
          {hasCustom && (
            <>
              <div className="dropdown-divider my-1" style={{ borderTop: '1px solid var(--border-color)' }}></div>
              <div className="px-3 py-1 text-xs text-[var(--muted-color)] select-none font-semibold tracking-wide">Custom Methods</div>
              {filteredCustom.map((verb, idx) => (
                <div
                  key={verb}
                  role="option"
                  aria-selected={flatSuggestions[highlightedIndex] === verb}
                  className={`dropdown-item flex items-center justify-between group px-3 py-1 select-none rounded ${flatSuggestions[highlightedIndex] === verb ? 'bg-[var(--primary-color-fade)]' : ''}`}
                  onMouseDown={() => handleSuggestionClick(verb)}
                  onMouseEnter={() => setHighlightedIndex(flatSuggestions.indexOf(verb))}
                  style={{ cursor: 'pointer' }}
                >
                  <span
                    style={{ color: getMethodColor(verb) }}
                    className={`uppercase font-medium flex items-center`}
                  >
                    {verb}
                    {method.toUpperCase() === verb && (
                      <span className="ml-2" aria-label="selected">✓</span>
                    )}
                  </span>
                  <span
                    className="ml-2 opacity-60 group-hover:opacity-100 hover:text-red-500"
                    onMouseDown={e => handleDeleteCustomMethod(verb, e)}
                    title="Remove custom method"
                    tabIndex={-1}
                    aria-label="Remove custom method"
                  >
                    <IconTrash size={14} />
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </Dropdown>
    </StyledWrapper>
  );
};

export default HttpMethodSelector;
