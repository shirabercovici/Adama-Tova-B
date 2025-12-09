"use client";

import styles from "../page.module.css";
import { type Concept, type Group, type Student } from "../types";
import ConceptSentence from "./ConceptSentence";

interface Props {
  groups: Group[];
  students: Student[];
  assignedStudents: number[];
  currentTeamMembers?: number[];
  currentConcept?: Concept;
  animate?: boolean;
}

export default function StudentList({
  groups,
  students,
  currentTeamMembers = [],
  assignedStudents,
  currentConcept,
  animate,
}: Props) {
  const currentTeamSelected = currentTeamMembers.length > 0;
  return (
    <>
      <div className={styles.studentGrid}>
        {groups.map((group) => {
          return (
            <div key={group.id}>
              <h2 className={styles.label}>{group.name}</h2>
              <div
                className={
                  currentTeamSelected
                    ? styles.studentTeamList
                    : styles.studentList
                }
              >
                {students
                  .filter((student) => student.group.id === group.id)
                  .map((student) => {
                    const studentInCurrentTeam = currentTeamMembers.includes(
                      student.id
                    );
                    const studentHide =
                      currentTeamSelected && !studentInCurrentTeam;
                    const studentHasBeenAssigned = assignedStudents.includes(
                      student.id
                    );
                    let className = styles.studentItem;
                    if (animate) className = `${className} ${styles.animate}`;
                    if (studentHide) return null;
                    if (studentInCurrentTeam)
                      className = `${className} ${styles.currentTeamMember}`;
                    if (studentHasBeenAssigned)
                      className = `${className} ${styles.assignedStudent}`;
                    return (
                      <div key={student.id} className={className}>
                        {student.name}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
      <div>
        <ConceptSentence concept={currentConcept} />
      </div>
    </>
  );
}
