import { FormEvent } from "react";
import { BUTTON_DISABLED_ACTION_TEXT } from "../constants";
import styles from "../page.module.css";

interface Props {
  id: string;
  text: string;
  handler: (event: FormEvent) => void;
  disabled: boolean;
}

export default function SessionAction({ id, text, handler, disabled }: Props) {
  const buttonText = disabled ? BUTTON_DISABLED_ACTION_TEXT : text;

  function actionHandler(event: FormEvent<HTMLButtonElement>) {
    event.preventDefault();
    handler(event);
  }

  return (
    <div id={id}>
      <button
        className={styles.actionButton}
        id={id}
        onClick={actionHandler}
        disabled={disabled}
      >
        {buttonText}
      </button>
    </div>
  );
}
