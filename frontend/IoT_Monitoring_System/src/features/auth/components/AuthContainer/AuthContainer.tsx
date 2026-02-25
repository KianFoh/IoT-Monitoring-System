import type { ReactNode } from "react";
import styles from "./AuthContainer.module.css";

interface Props {
  children: ReactNode;
}

export const AuthContainer = ({ children }: Props) => {
  return <div className={styles["auth-Container"]}>{children}</div>;
};
