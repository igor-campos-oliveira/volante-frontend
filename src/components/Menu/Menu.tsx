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
    const { logout, userEmail } = useAuthContext();
    const avatarFallback = useMemo(() => {
      if (!userEmail) return "?";
      return userEmail.trim().charAt(0).toUpperCase() || "?";
    }, [userEmail]);

    return (
        <nav className={cn(
          "select-none flex items-center gap-4 justify-center px-4 pt-4 md:gap-3 md:flex-col md:py-6 md:px-3 md:items-stretch md:overflow-hidden md:transition-[width] md:duration-500 md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          isCollapsed ? "md:w-[92px]" : "md:w-[244px]"
        )}>
            <div className="hidden md:flex justify-end">
              <button
                type="button"
                onClick={() => setIsCollapsed((prev) => !prev)}
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800"
                aria-label={isCollapsed ? "Abrir menu" : "Fechar menu"}
                title={isCollapsed ? "Abrir menu" : "Fechar menu"}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
            <div
              className={cn(
                "flex items-center md:justify-center md:overflow-hidden md:transition-[max-height,opacity,transform] md:duration-500 md:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                isCollapsed
                  ? "md:max-h-0 md:opacity-0 md:-translate-y-2 md:delay-0"
                  : "md:max-h-16 md:opacity-100 md:translate-y-0 md:delay-100"
              )}
            >
              <Logo/>
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
            <div className="hidden md:flex md:flex-col md:items-center md:gap-2 md:pb-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[--theme-highlight-100] text-[--theme-highlight]">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
              <p
                className={cn(
                  "max-w-full overflow-hidden whitespace-nowrap text-center text-xs text-zinc-500 transition-[max-height,opacity,transform] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                  isCollapsed ? "max-h-0 opacity-0 -translate-y-2 delay-0" : "max-h-8 opacity-100 translate-y-0 delay-150"
                )}
                title={userEmail ?? ""}
                aria-hidden={isCollapsed}
              >
                {userEmail ?? "sem-email@informado.com"}
              </p>
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
