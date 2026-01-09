import type { ReactNode } from "react";
import styles from "@/features/auth/styles/auth.module.css";

interface Props {
  children: ReactNode;
}

export const AuthLinks = ({ children }: Props) => {
  return <div className={styles["auth-Links"]}>{children}</div>;
};
