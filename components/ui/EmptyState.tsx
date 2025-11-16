type Props = {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  ctaLabel?: string;
  ctaHref?: string;
  icon?: React.ReactNode;
};

export function EmptyState({ title, description, action, ctaLabel, ctaHref, icon }: Props) {
  // Support both old 'action' prop and new 'ctaLabel'/'ctaHref' props
  const finalCtaLabel = ctaLabel || action?.label;
  const finalCtaHref = ctaHref || action?.href;

  return (
    <div className="card p-8 sm:p-12 text-center">
      {icon && (
        <div className="flex justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {finalCtaLabel && finalCtaHref && (
        <a
          href={finalCtaHref}
          className="btn inline-flex items-center gap-2"
        >
          {finalCtaLabel}
        </a>
      )}
    </div>
  );
}

