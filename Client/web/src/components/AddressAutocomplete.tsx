import { useState, useEffect } from "react";
import "./AddressAutocomplete.css";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  onSelect?: (address: string) => void;
  error?: string;
  disabled?: boolean;
}

interface AddressSuggestion {
  display_name: string;
  place_id?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing address...",
  onSelect,
  error,
  disabled = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value.length > 2) {
      const timeoutId = setTimeout(() => {
        fetchAddressSuggestions(value);
      }, 300); // Debounce API calls

      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const fetchAddressSuggestions = async (query: string) => {
    setLoading(true);
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      // This works for US addresses and worldwide addresses
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `countrycodes=us&` +
        `q=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'MediHealth App', // Required by Nominatim
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Format the addresses for display
        const formattedAddresses: AddressSuggestion[] = data.map((item: any) => ({
          display_name: item.display_name,
          place_id: item.place_id,
        }));
        setSuggestions(formattedAddresses);
        setShowSuggestions(formattedAddresses.length > 0);
      } else {
        console.error('Address lookup failed');
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      // Fallback to empty suggestions on error
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (address: AddressSuggestion) => {
    onChange(address.display_name);
    if (onSelect) {
      onSelect(address.display_name);
    }
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleFocus = () => {
    if (value.length > 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="address-autocomplete">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`address-input ${error ? "error" : ""}`}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="address-suggestions">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id || index}
              className="address-suggestion-item"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(suggestion);
              }}
            >
              {suggestion.display_name}
            </div>
          ))}
        </div>
      )}
      {loading && value.length > 2 && (
        <div className="address-loading">Searching addresses...</div>
      )}
    </div>
  );
}
