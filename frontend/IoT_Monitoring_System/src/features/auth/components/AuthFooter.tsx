import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export const AuthFooter = ({ children }: Props) => {
  return <div className="authFooter">{children}</div>;
};
