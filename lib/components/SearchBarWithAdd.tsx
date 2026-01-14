"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import styles from "./SearchBarWithAdd.module.css";

interface SearchBarWithAddProps {
  placeholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  onBackClick?: () => void;
  addButtonLabel?: string;
  searchBarLabel?: string;
  isSearchActive?: boolean;
  onSearchActiveChange?: (active: boolean) => void;
  onCloseSearch?: () => void;
}

export default function SearchBarWithAdd({
  placeholder = "חיפוש צוות",
  searchValue,
  onSearchChange,
  onAddClick,
  onBackClick,
  addButtonLabel = "הוסף איש צוות",
  searchBarLabel = "חיפוש",
  isSearchActive: externalIsSearchActive,
  onSearchActiveChange,
  onCloseSearch,
}: SearchBarWithAddProps) {
  const [internalIsSearchActive, setInternalIsSearchActive] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isSearchActive = externalIsSearchActive !== undefined 
    ? externalIsSearchActive 
    : internalIsSearchActive;
  
  const setIsSearchActive = useCallback((active: boolean) => {
    if (onSearchActiveChange) {
      onSearchActiveChange(active);
    } else {
      setInternalIsSearchActive(active);
    }
  }, [onSearchActiveChange]);

  // Handle search input focus/blur
  const handleSearchFocus = () => {
    setIsSearchActive(true);
  };

  const handleSearchBlur = () => {
    // Don't deactivate if there's text in the search
    if (searchValue.trim() === "") {
      setIsSearchActive(false);
    }
  };

  // Handle back arrow button - always navigates back if onBackClick provided, otherwise closes search
  const handleBackArrow = () => {
    if (onBackClick) {
      // Always navigate back if handler provided
      onBackClick();
    } else if (isSearchActive) {
      // If search is active, close it
      if (onCloseSearch) {
        onCloseSearch();
      } else {
        setIsSearchActive(false);
        onSearchChange("");
      }
    }
  };

  // Keep search active if there's text
  useEffect(() => {
    if (searchValue.trim() !== "") {
      setIsSearchActive(true);
    }
  }, [searchValue, setIsSearchActive]);

  return (
    <div className={styles.searchBarContainer}>
      {/* Search Bar */}
      <div className={styles.searchBarWrapper}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          className={styles.searchInput}
          aria-label={searchBarLabel}
        />
        {/* Back arrow inside search bar */}
        <button
          type="button"
          onClick={handleBackArrow}
          className={styles.backArrowButton}
          aria-label={onBackClick ? "חזור" : (isSearchActive ? "סגור חיפוש" : "חזור")}
        >
          <Image
            src="/icons/right_arrow.svg"
            alt={isSearchActive ? "סגור חיפוש" : "חזור"}
            width={24}
            height={24}
            className={styles.backArrowIcon}
            unoptimized
          />
        </button>
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={onAddClick}
        className={styles.addButton}
        aria-label={addButtonLabel}
      >
        <Image
          src="/icons/add_new.svg"
          alt={addButtonLabel}
          width={24}
          height={24}
          className={styles.addButtonIcon}
          unoptimized
        />
      </button>
    </div>
  );
}
