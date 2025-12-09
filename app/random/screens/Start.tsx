"use client";

import type { StateDescriptor, TransitionStateFunction } from "../types";
import SessionAction from "../components/SessionAction";
import MainTitle from "../components/MainTitle";

interface Props {
  stateDescriptor: StateDescriptor;
  transitionToStateFn: TransitionStateFunction;
}

export default function Start({ stateDescriptor, transitionToStateFn }: Props) {
  function actionHandler() {
    transitionToStateFn(stateDescriptor.next);
  }

  return (
    <>
      <MainTitle />
      <SessionAction
        handler={actionHandler}
        id={stateDescriptor.action.id}
        text={stateDescriptor.action.text}
        disabled={stateDescriptor.action.disabled}
      />
    </>
  );
}
