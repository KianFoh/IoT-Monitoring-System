import { Link } from "react-router-dom";
import styles from "./AuthSuccess.module.css";

interface Props {
  title: string;
  message: string;
  redirectLink: string;
  redirectText: string;
}

export const AuthSuccess = ({ title, message, redirectLink, redirectText }: Props) => {
  return (
    <div className={styles["auth-Success"]}>
      <div className={styles["auth-SuccessIcon"]}>{"\u2713"}</div>
      <h3 className={styles["auth-HeaderTitle"]}>{title}</h3>
      <p className={styles["auth-SuccessMessage"]}>{message}</p>
      <Link to={redirectLink} className={styles["auth-SuccessButton"]}>
        {redirectText}
      </Link>
    </div>
  );
};
