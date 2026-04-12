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
          "select-none flex items-center gap-4 justify-center px-4 pt-4 md:gap-3 md:flex-col md:py-6 md:px-3 md:items-stretch md:overflow-hidden md:transition-[width] md:duration-300",
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
            <div className={cn("flex items-center md:justify-center", isCollapsed && "md:hidden")}>
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
                        {!isCollapsed && label}
                    </NavLink>
                ))}
            </ol>
            <div className="hidden md:flex md:flex-col md:items-center md:gap-2 md:pb-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[--theme-highlight-100] text-[--theme-highlight]">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <p className="max-w-full truncate text-center text-xs text-zinc-500" title={userEmail ?? ""}>
                  {userEmail ?? "sem-email@informado.com"}
                </p>
              )}
            </div>
            <ConfirmButton 
                variant={"link"}
                title={"Deseja realmente sair?"}
                className={cn("text-zinc-400 hover:text-red-500 md:flex md:items-center", isCollapsed && "md:justify-center md:px-0")}
                onConfirm={() => logout()}
            >
                <LogOut size={20} className={cn(!isCollapsed && "pr-2")}/>
                {!isCollapsed && "Sair"}
            </ConfirmButton>
        </nav>
    );
};

export default Menu;
