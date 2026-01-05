import { Link } from "react-router-dom";

interface Props {
  title: string;
  message: string;
  redirectLink: string;
  redirectText: string;
}

export const AuthSuccess = ({ title, message, redirectLink, redirectText }: Props) => {
  return (
    <div className="authSuccess">
      <div className="successIcon">✓</div>
      <h3 className="authHeaderTitle">{title}</h3>
      <p className="successMessage">{message}</p>
      <Link to={redirectLink} className="successButton">
        {redirectText}
      </Link>
    </div>
  );
};
