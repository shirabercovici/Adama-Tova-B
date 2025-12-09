"use client";

import styles from "../page.module.css";
import { type Concept } from "../types";

interface Props {
  concept?: Concept;
}

export default function ConceptSentence({ concept }: Props) {
  return (
    <div style={{ opacity: concept ? 1 : 0 }} className={styles.concept}>
      <span className={styles.label}>כמו</span>
      <br />
      {concept?.name ?? "."}
      <br />
      <span className={styles.label}>אבל עבור</span>
      <br />
      {concept?.idea ?? "."}
    </div>
  );
}
