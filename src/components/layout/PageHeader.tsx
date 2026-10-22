import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  help?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  help,
}: PageHeaderProps) {
  return (
    <div className="mb-6 mt-7 flex flex-wrap items-end justify-between gap-5 lg:mb-[24px] lg:mt-[31px]">
      <div className="min-w-0">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="page-title">{title}</h1>
        <p className="page-sub">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {help}
        {actions}
      </div>
    </div>
  );
}
