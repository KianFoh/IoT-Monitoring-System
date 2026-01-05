import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export const AuthLinks = ({ children }: Props) => {
  return <div className="authLinks">{children}</div>;
};
