import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { ReactElement, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import Logo from "@/../public/assets/svg/logo";
import ConfirmButton from "../ConfirmButton/ConfirmButton";
import { useAuthContext } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "../ui/avatar";
// import logo from "/assets/app-logo.png"

const MenuNavLinkVariant = cva(
  "flex items-center gap-2 w-full p-3 rounded-xl text-sm transition hover:bg-zinc-200 hover:text-black",
  {
    variants: {
      isActive: {
        true: "font-bold text-white text-black",
        false: "text-zinc-500",
      },
      isCollapsed: {
        true: "justify-center",
        false: "",
      },
    },
    defaultVariants: {
      isActive: false,
      isCollapsed: false,
    },
  }
);
// [&_svg]:text-highlight 
interface MenuProps {
    links: { path: string, label:string, icon?:ReactElement }[]
}

const Menu = ({links}: MenuProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { logout, userEmail, userCompanyName } = useAuthContext();
    const avatarFallback = useMemo(() => {
      if (!userEmail) return "?";
      return userEmail.trim().charAt(0).toUpperCase() || "?";
    }, [userEmail]);

    return (
        <nav className={cn(
          "relative select-none flex items-center gap-4 justify-center px-4 pt-4 md:gap-3 md:flex-col md:py-6 md:px-3 md:items-stretch md:overflow-visible md:transition-[width] md:duration-500 md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          isCollapsed ? "md:w-[92px]" : "md:w-[208px]"
        )}>
            <div
              className={cn(
                "relative flex w-full items-center justify-center md:overflow-visible"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center md:overflow-hidden md:whitespace-nowrap md:transition-[max-width,opacity,transform] md:duration-500 md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                  isCollapsed
                    ? "md:max-w-0 md:opacity-0 md:-translate-x-2 md:delay-0"
                    : "md:max-w-32 md:opacity-100 md:translate-x-0 md:delay-100"
                )}
              >
                <Logo/>
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed((prev) => !prev)}
                className="hidden md:absolute md:-right-5 md:top-1/2 md:z-20 md:inline-flex md:-translate-y-1/2 rounded-full border border-zinc-200 bg-zinc-50 p-2 text-zinc-500 shadow-sm transition hover:bg-zinc-200 hover:text-zinc-800"
                aria-label={isCollapsed ? "Abrir menu" : "Fechar menu"}
                title={isCollapsed ? "Abrir menu" : "Fechar menu"}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
            <ol className="flex-1 px-4 flex gap-1 items-center md:flex-col md:px-0">
                {links.map(({path, label, icon}) => (
                    <NavLink
                      key={path}
                      to={path}
                      className={({isActive}) => cn(MenuNavLinkVariant({isActive, isCollapsed}))}
                      title={label}
                    >
                        {icon}
                        <span
                          className={cn(
                            "hidden md:inline-block md:overflow-hidden md:whitespace-nowrap md:transition-[max-width,opacity,transform] md:duration-500 md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                            isCollapsed
                              ? "md:max-w-0 md:opacity-0 md:-translate-x-2 md:delay-0"
                              : "md:max-w-[140px] md:opacity-100 md:translate-x-0 md:delay-75"
                          )}
                          aria-hidden={isCollapsed}
                        >
                          {label}
                        </span>
                        <span className="md:hidden">{label}</span>
                    </NavLink>
                ))}
            </ol>
            <div className="hidden md:flex md:w-full md:items-center md:justify-center md:pb-1">
              <div
                className={cn(
                  "flex w-full items-center overflow-hidden transition-[gap,justify-content] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                  isCollapsed ? "justify-center gap-0" : "justify-center gap-2"
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-[--theme-highlight-100] text-[--theme-highlight]">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                    isCollapsed
                      ? "max-w-0 opacity-0 -translate-x-2 delay-0"
                      : "max-w-[132px] opacity-100 translate-x-0 delay-100"
                  )}
                  aria-hidden={isCollapsed}
                >
                  <p
                    className="truncate text-left text-xs text-zinc-500"
                    title={userEmail ?? ""}
                  >
                    {userEmail ?? "sem-email@informado.com"}
                  </p>
                  <p
                    className="truncate text-left text-[11px] text-zinc-400"
                    title={userCompanyName ?? ""}
                  >
                    {userCompanyName ?? "empresa-nao-informada"}
                  </p>
                </div>
              </div>
            </div>
            <ConfirmButton 
                variant={"link"}
                title={"Deseja realmente sair?"}
                className={cn("text-zinc-400 hover:text-red-500 md:flex md:items-center", isCollapsed && "md:justify-center md:px-0")}
                onConfirm={() => logout()}
            >
                <LogOut size={20} className={cn(!isCollapsed && "pr-2")}/>
                <span
                  className={cn(
                    "hidden md:inline-block md:overflow-hidden md:whitespace-nowrap md:transition-[max-width,opacity,transform] md:duration-500 md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                    isCollapsed
                      ? "md:max-w-0 md:opacity-0 md:-translate-x-2 md:delay-0"
                      : "md:max-w-16 md:opacity-100 md:translate-x-0 md:delay-75"
                  )}
                  aria-hidden={isCollapsed}
                >
                  Sair
                </span>
                <span className="md:hidden">Sair</span>
            </ConfirmButton>
        </nav>
    );
};

export default Menu;
