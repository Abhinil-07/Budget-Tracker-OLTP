import {
  LayoutGrid,
  Wallet,
  Dumbbell,
  UtensilsCrossed,
  BookOpen,
  Tv,
  Settings,
  LayoutDashboard,
  ArrowLeftRight,
  Scale,
  TrendingUp,
  PieChart,
  History,
  Target,
  Bookmark,
  LucideIcon,
} from "lucide-react";

export interface SubNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface ModuleDefinition {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  subItems?: SubNavItem[];
}

export const LIFE_OS_MODULES: ModuleDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/",
    icon: LayoutGrid,
  },
  {
    id: "finance",
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    subItems: [
      { name: "Dashboard", href: "/finance", icon: LayoutDashboard },
      { name: "Transactions", href: "/finance/transactions", icon: ArrowLeftRight },
      { name: "Reconciliation", href: "/finance/reconciliation", icon: Scale },
      { name: "Accounts", href: "/finance/accounts", icon: Wallet },
      { name: "Investments", href: "/finance/investments", icon: TrendingUp },
      { name: "Budget", href: "/finance/budget", icon: PieChart },
    ],
  },
  {
    id: "gym",
    label: "Gym",
    href: "/gym",
    icon: Dumbbell,
    subItems: [
      { name: "Workout Log", href: "/gym", icon: Dumbbell },
      { name: "History", href: "/gym/history", icon: History },
    ],
  },
  {
    id: "food",
    label: "Food",
    href: "/food",
    icon: UtensilsCrossed,
    subItems: [
      { name: "Daily Log", href: "/food", icon: UtensilsCrossed },
      { name: "History", href: "/food/history", icon: History },
    ],
  },
  {
    id: "study",
    label: "Study",
    href: "/study",
    icon: BookOpen,
    subItems: [
      { name: "Study Log", href: "/study", icon: BookOpen },
      { name: "Monthly Goals", href: "/study/goals", icon: Target },
    ],
  },
  {
    id: "reading",
    label: "Reading & Watching",
    href: "/reading",
    icon: Tv,
    subItems: [
      { name: "Library", href: "/reading", icon: Bookmark },
    ],
  },
];

export const BOTTOM_MODULES: ModuleDefinition[] = [
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function getActiveModule(pathname: string): ModuleDefinition {
  if (pathname.startsWith("/finance")) return LIFE_OS_MODULES[1];
  if (pathname.startsWith("/gym")) return LIFE_OS_MODULES[2];
  if (pathname.startsWith("/food")) return LIFE_OS_MODULES[3];
  if (pathname.startsWith("/study")) return LIFE_OS_MODULES[4];
  if (pathname.startsWith("/reading")) return LIFE_OS_MODULES[5];
  if (pathname.startsWith("/settings")) return BOTTOM_MODULES[0];
  return LIFE_OS_MODULES[0];
}
