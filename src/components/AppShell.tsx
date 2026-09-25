import { type ReactNode, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, LogOut, Menu, X } from "lucide-react";

export type MenuItem = {
  label: string;
  to: string;
  icon: ReactNode;
  title?: string;
  section?: string;
};

export type Notification = {
  tipo: string;
  texto: string;
  quando: string;
  lida: boolean;
};

type AppShellProps = {
  menuItems: MenuItem[];
  roleLabel: string;
  user: { nome: string; iniciais: string };
  notifications?: Notification[];
  notifFooter?: string;
  children: ReactNode;
};

function isActive(item: MenuItem, pathname: string) {
  const isIndex = item.to.split("/").length <= 2;
  return isIndex ? pathname === item.to : pathname.startsWith(item.to);
}

function tagColor(tipo: string) {
  return ["Pagamento", "Indicador"].includes(tipo)
    ? { color: "text-danger-dark", bg: "bg-danger/10" }
    : { color: "text-teal-dark", bg: "bg-teal/15" };
}

export default function AppShell({
  menuItems,
  roleLabel,
  user,
  notifications: initialNotifications = [],
  notifFooter,
  children,
}: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const active = menuItems.find((item) => isActive(item, location.pathname));
  const pageTitle = active?.title ?? active?.label ?? "";
  const temNotif = notifications.some((n) => !n.lida);

  let lastSection: string | undefined;

  return (
    <div className="min-h-screen bg-beige/30 md:flex">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-navy/60 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto bg-navy px-3.5 py-5 transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-[74px]" : "md:w-64"}`}
      >
        <div
          className={`flex items-center gap-2 px-1 ${collapsed ? "md:flex-col" : "justify-between"}`}
        >
          <span
            className={`font-display text-2xl font-bold tracking-wide text-white ${collapsed ? "md:hidden" : ""}`}
          >
            GYMFLOW
          </span>
          <span
            className={`font-display hidden text-xl font-bold tracking-wide text-neon ${collapsed ? "md:inline" : ""}`}
          >
            GF
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="hidden h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/65 transition hover:text-white md:flex"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="rounded-lg p-1.5 text-white/55 transition hover:text-white md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div
          title={user.nome}
          className={`mt-[22px] flex shrink-0 items-center gap-2.5 rounded-xl bg-white/10 p-2.5 ${collapsed ? "md:justify-center md:p-2" : ""}`}
        >
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-teal text-[13px] font-bold text-navy-dark">
            {user.iniciais}
          </div>
          <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
            <div className="truncate text-[13px] font-bold text-white">
              {user.nome}
            </div>
            <div className="text-[11px] font-semibold text-neon">
              {roleLabel}
            </div>
          </div>
        </div>

        <nav className="mt-5 flex flex-1 flex-col gap-0.5">
          {menuItems.map((item) => {
            const showSection = item.section && item.section !== lastSection;
            lastSection = item.section;
            const itemIsActive = isActive(item, location.pathname);

            return (
              <div key={item.to}>
                {showSection &&
                  (collapsed ? (
                    <div className="mx-2 my-2.5 h-px bg-white/10 md:block" />
                  ) : (
                    <div className="px-3 pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
                      {item.section}
                    </div>
                  ))}
                <NavLink
                  to={item.to}
                  end={item.to.split("/").length <= 2}
                  title={collapsed ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center rounded-[10px] px-3 py-2.5 text-sm font-semibold transition ${
                    collapsed ? "md:justify-center" : "gap-3"
                  } ${
                    itemIsActive
                      ? "bg-white/12 text-white shadow-[inset_3px_0_0_0_var(--color-neon)]"
                      : "text-white/62 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span aria-hidden className="shrink-0">
                    {item.icon}
                  </span>
                  <span className={collapsed ? "md:hidden" : ""}>
                    {item.label}
                  </span>
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="mt-2.5 border-t border-white/10 pt-2.5">
          <button
            type="button"
            onClick={() => navigate("/login")}
            title={collapsed ? "Sair" : undefined}
            className={`flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white ${
              collapsed ? "md:justify-center" : "gap-3"
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>Sair</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-navy/10 bg-beige/90 px-5 py-3.5 backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-navy/15 bg-white md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-navy/40">
                {roleLabel}
              </div>
              <div className="font-display truncate text-[22px] font-bold leading-tight text-navy">
                {pageTitle}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            aria-label="Notificações"
            className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-navy/15 bg-white transition hover:border-teal"
          >
            <Bell size={19} />
            {temNotif && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-teal" />
            )}
          </button>
        </header>

        {notifOpen && (
          <div
            className="fixed inset-0 z-[60] flex justify-end bg-navy/35"
            onClick={() => setNotifOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-full max-w-[380px] animate-[gfIn_.25s_ease_both] flex-col overflow-auto bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-navy">
                  Notificações
                </h2>
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  aria-label="Fechar"
                  className="p-1 text-navy/50 hover:text-navy"
                >
                  <X size={20} />
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNotifications((prev) =>
                    prev.map((n) => ({ ...n, lida: true })),
                  )
                }
                className="mt-2.5 self-start text-xs font-bold text-teal-mid"
              >
                Marcar todas como lidas
              </button>

              <div className="mt-4 flex flex-col gap-2.5">
                {notifications.map((n, i) => {
                  const tag = tagColor(n.tipo);
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-3.5 ${
                        n.lida
                          ? "border-navy/10 bg-white"
                          : "border-teal/45 bg-teal/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tag.color} ${tag.bg}`}
                        >
                          {n.tipo}
                        </span>
                        <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] text-navy/45">
                          {n.quando}
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed">
                        {n.texto}
                      </p>
                    </div>
                  );
                })}
              </div>

              {notifFooter && (
                <p className="mt-5 text-[11px] leading-relaxed text-navy/40">
                  {notifFooter}
                </p>
              )}
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 pb-14">
          {children}
        </main>
      </div>
    </div>
  );
}
