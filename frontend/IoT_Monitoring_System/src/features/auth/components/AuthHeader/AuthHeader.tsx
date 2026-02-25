import styles from "./AuthHeader.module.css";

interface Props {
  title: string;
  subtitle: string;
  logoSrc?: string | null;
  logoAlt?: string;
}

export const AuthHeader = ({ title, subtitle, logoSrc, logoAlt }: Props) => {
  return (
    <div className={styles["auth-Header"]}>
      {logoSrc && (
        <div className={styles["auth-HeaderLogo"]}>
          <img src={logoSrc} alt={logoAlt || "Brand logo"} />
        </div>
      )}
      <h2 className={styles["auth-HeaderTitle"]}>{title}</h2>
      <p className={styles["auth-HeaderSubtitle"]}>{subtitle}</p>
    </div>
  );
};
