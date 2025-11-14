import React, { useState, useEffect } from 'react';

function useDebounce(value: string, delay: number) {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState<string>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timeout if the value or delay changes, or if the component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run effect if value or delay changes

  return debouncedValue;
}

const DebouncedInput = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce for 500ms

  // Effect to perform action based on debounced search term
  useEffect(() => {
    if (debouncedSearchTerm) {
      console.log('Performing search for:', debouncedSearchTerm);
      // Here you would typically make an API call or filter data
    }
  }, [debouncedSearchTerm]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <input
      type="text"
      placeholder="Search..."
      value={searchTerm}
      onChange={handleChange}
    />
  );
};

export default DebouncedInput;
