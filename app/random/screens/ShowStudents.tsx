"use client";

import type { Data, StateDescriptor, TransitionStateFunction } from "../types";
import SessionAction from "../components/SessionAction";
import StudentList from "../components/StudentList";
import Wrapper from "../components/Wrapper";

interface Props {
  data: Data;
  assignedStudents: number[];
  stateDescriptor: StateDescriptor;
  transitionToStateFn: TransitionStateFunction;
}

export default function ShowStudents({
  data,
  assignedStudents,
  stateDescriptor,
  transitionToStateFn,
}: Props) {
  function actionHandler() {
    transitionToStateFn(stateDescriptor.next);
  }

  return (
    <Wrapper>
      <StudentList
        groups={data.groups}
        students={data.students}
        assignedStudents={assignedStudents}
      />
      <SessionAction
        handler={actionHandler}
        id={stateDescriptor.action.id}
        text={stateDescriptor.action.text}
        disabled={stateDescriptor.action.disabled}
      />
    </Wrapper>
  );
}
