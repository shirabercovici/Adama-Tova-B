"use client";

import styles from "../page.module.css";

export default function MainTitle() {
  return (
    <div className={styles.mainTitle}>
      <span className={styles.label}>ג׳אם</span>
      <img src="/random-logo.svg" alt="jam" />
      <span className={styles.label}>2025 - 2026</span>
    </div>
  );
}
