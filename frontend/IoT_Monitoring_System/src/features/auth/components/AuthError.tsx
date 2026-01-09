import { Link } from "react-router-dom";
import styles from "../styles/auth.module.css";

interface Props {
  title: string;
  message: string;
  backLink: string;
  backLinkText: string;
}

export const AuthError = ({ title, message, backLink, backLinkText }: Props) => {
  return (
    <div className={styles["auth-Error"]}>
      <h2 className={styles["auth-ErrorTitle"]}>{title}</h2>
      <p className={styles["auth-ErrorMessage"]}>{message}</p>
      <Link to={backLink} className={styles["auth-ErrorLink"]}>
        {backLinkText}
      </Link>
    </div>
  );
};
