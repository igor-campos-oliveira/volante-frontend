import { Card as BasicCard, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ButtonHTMLAttributes, ReactNode, createContext, useContext, useState } from "react";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface IProps extends React.HTMLAttributes<HTMLDivElement>{
    children?: ReactNode,
    className?: string
}

const CardContext = createContext<{ isOpen: boolean }>({ isOpen: false });
const useCard = () => useContext(CardContext);

export default function Card({children, className, ...props}: IProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <CardContext.Provider value={{ isOpen }}>
      <BasicCard
        {...props}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          rounded-lg flex flex-col relative cursor-pointer
          transition-all duration-300 overflow-hidden

          ${isOpen 
            ? "shadow-xl border-[--theme-highlight]" 
            : "active:scale-95"
          }

          hover:shadow-md hover:-translate-y-1

          ${className}
        `}
      >
        
        {children}
      </BasicCard>
    </CardContext.Provider>
  )
}

Card.Container = ({children}: {children: ReactNode}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[repeat(2,minmax(320px,1fr))] lg:grid-cols-[repeat(3,minmax(320px,1fr))] xl:grid-cols-[repeat(4,minmax(320px,1fr))] content-start flex-1 gap-2 flex-wrap overflow-y-scroll">
            {children}
        </div>
    )
}

Card.Badge = ({children}: {children?: ReactNode}) => {
    return (
        <Badge className="bg-[--theme-highlight] shadow-none absolute right-1 top-1 h-3">
            {children}
        </Badge>
    )
}

Card.Header = ({title, description, avatar, children, fallback}: {title?: string, description?: string, children?: ReactNode, avatar?: string, fallback?: string}) => {
    return (
        <CardHeader className={'flex flex-row justify-center items-center gap-4 h-21 flex-1 min-w-[160px]'}>
            {children}
            {(avatar || fallback) && 
                <Avatar>
                    {avatar && <AvatarImage src={avatar}/>}
                    {fallback && (
                        <AvatarFallback className="bg-[--theme-highlight-100] text-[--theme-highlight]">
                            {fallback}
                        </AvatarFallback>
                    )}
                </Avatar>
            }
            <div className="flex-1 min-w-[160px]">
                {title && <CardTitle>{title}</CardTitle>}
                {description && <CardDescription className="text-md text-gray-500">{description}</CardDescription>}
            </div>
        </CardHeader>
    )
}

Card.Content = ({children}: {children: ReactNode}) => {
    return (
        <CardContent>
            {children}
        </CardContent>
    )
}

Card.Expanded = ({children}: {children: ReactNode}) => {
    const { isOpen } = useCard();

    if (!isOpen) return null;

    return (
        <div className="px-4 pb-4 animate-in fade-in duration-300">
            {children}
        </div>
    )
}

Card.HeaderActions = ({children, className}: {children: ReactNode, className?: string}) => {
    return (
        <div className={`flex items-center justify-center h-full ${className}`}>
            {children}
        </div>
    )
}

interface ActionProps extends ButtonHTMLAttributes<HTMLButtonElement>{
    icon: ReactNode,
}
Card.Action = ({icon, className, ...rest}: ActionProps) => {
    return (
        <button 
            {...rest} 
            onClick={(e) => e.stopPropagation()} 
            className={`p-2 m-0 rounded-full hover:bg-gray-200 transition ${className}`}
        >
            {icon}
        </button>
    );
}