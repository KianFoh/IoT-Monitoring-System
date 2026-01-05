import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export const AuthContainer = ({ children }: Props) => {
  return <div className="authContainer">{children}</div>;
};
