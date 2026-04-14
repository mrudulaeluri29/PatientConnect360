import NotificationBell from "../NotificationBell";

interface ShellHeaderProps {
  sectionGroupLabel?: string;
  sectionTitle: string;
  userName: string;
  roleLabel: string;
  onLogout: () => void | Promise<void>;
  onNotificationMessageClick?: (view: string, conversationId?: string, messageId?: string) => void;
  onOpenMobileNav: () => void;
}

export default function ShellHeader({
  sectionGroupLabel,
  sectionTitle,
  userName,
  roleLabel,
  onLogout,
  onNotificationMessageClick,
  onOpenMobileNav,
}: ShellHeaderProps) {
  return (
    <header className="dashboard-shell-header">
      <div className="dashboard-shell-header__left">
        <button type="button" className="dashboard-shell-header__menu-button" onClick={onOpenMobileNav} aria-label="Open navigation menu">
          <span />
          <span />
          <span />
        </button>
        <div className="dashboard-shell-header__titles">
          {sectionGroupLabel ? <div className="dashboard-shell-header__eyebrow">{sectionGroupLabel}</div> : null}
          <h1 className="dashboard-shell-header__title">{sectionTitle}</h1>
        </div>
      </div>

      <div className="dashboard-shell-header__right">
        <NotificationBell onMessageClick={onNotificationMessageClick} />
        <div className="dashboard-shell-header__user">
          <span className="dashboard-shell-header__user-name">{userName}</span>
          <span className="dashboard-shell-header__role-badge">{roleLabel}</span>
        </div>
        <button type="button" className="dashboard-shell-header__logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
