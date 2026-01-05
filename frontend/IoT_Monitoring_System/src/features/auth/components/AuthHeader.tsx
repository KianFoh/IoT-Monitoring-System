interface Props {
  title: string;
  subtitle: string;
}

export const AuthHeader = ({ title, subtitle }: Props) => {
  return (
    <div className="authHeader">
      <h2 className="authHeaderTitle">{title}</h2>
      <p className="authHeaderSubtitle">{subtitle}</p>
    </div>
  );
};
