"use client";

import styles from "../page.module.css";
import { type AssignedTeam, type Group, type Student } from "../types";

interface Props {
  teams: AssignedTeam[];
  students: Student[];
  groups: Group[];
}

export default function TeamList({ teams, students, groups }: Props) {
  return (
    <div className={styles.teamGrid}>
      {teams.map((team, idx) => {
        return (
          <div key={idx} className={styles.student}>
            <span className={styles.label}>
              כמו <strong>{team.concept.name}</strong> אבל עבור{" "}
              <strong>{team.concept.idea}</strong>
            </span>
            <br />
            <span>
              {students
                .filter((s) => team.students.includes(s.id))
                .map((student) => student.name)
                .join(", ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
