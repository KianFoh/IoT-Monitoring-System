import type { ReactNode } from "react";
import styles from "../styles/auth.module.css";

interface Props {
  children: ReactNode;
}

export const AuthFooter = ({ children }: Props) => {
  return <div className={styles["auth-Footer"]}>{children}</div>;
};
