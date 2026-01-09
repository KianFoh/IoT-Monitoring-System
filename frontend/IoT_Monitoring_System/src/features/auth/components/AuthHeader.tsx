import styles from "@/features/auth/styles/auth.module.css";

interface Props {
  title: string;
  subtitle: string;
}

export const AuthHeader = ({ title, subtitle }: Props) => {
  return (
    <div className={styles["auth-Header"]}>
      <h2 className={styles["auth-HeaderTitle"]}>{title}</h2>
      <p className={styles["auth-HeaderSubtitle"]}>{subtitle}</p>
    </div>
  );
};
