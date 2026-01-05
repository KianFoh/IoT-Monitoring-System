import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export const AuthCard = ({ children }: Props) => {
  return <div className="authCard">{children}</div>;
};
