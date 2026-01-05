import { Link } from "react-router-dom";

interface Props {
  title: string;
  message: string;
  backLink: string;
  backLinkText: string;
}

export const AuthError = ({ title, message, backLink, backLinkText }: Props) => {
  return (
    <div className="authError">
      <h2 className="authErrorTitle">{title}</h2>
      <p className="authErrorMessage">{message}</p>
      <Link to={backLink} className="authErrorLink">
        {backLinkText}
      </Link>
    </div>
  );
};
