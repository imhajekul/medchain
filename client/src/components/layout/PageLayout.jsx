import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, AlertCircle } from 'lucide-react';
import './PageLayout.css';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

/**
 * Shared page layout for dedicated route pages.
 * Provides breadcrumbs, page header, loading skeleton, and error display.
 *
 * @param {Object} props
 * @param {string} props.title - Page heading
 * @param {string} [props.subtitle] - Optional subtitle below heading
 * @param {React.ReactNode} [props.icon] - Icon rendered before the title
 * @param {{ label: string, to?: string }[]} [props.breadcrumbs] - Breadcrumb trail
 * @param {React.ReactNode} [props.actions] - Action buttons rendered in header right
 * @param {boolean} [props.loading] - Show skeleton loader
 * @param {string} [props.error] - Error message
 * @param {function} [props.onRetry] - Retry callback for error state
 * @param {React.ReactNode} props.children - Page content
 */
export default function PageLayout({
  title,
  subtitle,
  icon,
  breadcrumbs = [],
  actions,
  loading,
  error,
  onRetry,
  children
}) {
  // Always include Dashboard as the root breadcrumb
  const fullBreadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    ...breadcrumbs
  ];

  return (
    <div className="page-layout page-wrapper">
      <motion.div
        className="container"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Breadcrumbs */}
        <motion.nav className="page-breadcrumbs" variants={itemVariants} aria-label="Breadcrumb">
          {fullBreadcrumbs.map((crumb, idx) => (
            <span key={idx} className="page-breadcrumb-item">
              {idx > 0 && <ChevronRight size={14} className="page-breadcrumb-sep" />}
              {crumb.to ? (
                <Link to={crumb.to} className="page-breadcrumb-link">{crumb.label}</Link>
              ) : (
                <span className="page-breadcrumb-current">{crumb.label}</span>
              )}
            </span>
          ))}
        </motion.nav>

        {/* Page Header */}
        <motion.div className="page-header" variants={itemVariants}>
          <div className="page-header-left">
            {icon && <div className="page-header-icon">{icon}</div>}
            <div>
              <h1 className="page-header-title">{title}</h1>
              {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="page-header-actions">{actions}</div>}
        </motion.div>

        {/* Error Banner */}
        {error && (
          <motion.div
            className="page-error glass-card"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="page-error-content">
              <AlertCircle size={20} />
              <div>
                <strong>Error:</strong> {error}
              </div>
            </div>
            {onRetry && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>
                Retry
              </button>
            )}
          </motion.div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <motion.div className="page-skeleton" variants={itemVariants}>
            <div className="skeleton" style={{ width: '100%', height: 120, borderRadius: 12 }} />
            <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 12 }} />
            <div className="skeleton" style={{ width: '60%', height: 80, borderRadius: 12 }} />
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            {children}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export { itemVariants, containerVariants };
