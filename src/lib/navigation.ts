import {
  Home,
  Dumbbell,
  Package,
  BarChart3,
  Timer,
  Activity,
  Box,
  ShoppingCart,
  RotateCcw,
  Target,
  Calendar,
  BookOpen,
  Settings,
  FolderKanban,
  Trash2,
  LineChart,
  type LucideIcon,
} from 'lucide-react'

export interface NavTab {
  to: string
  icon: LucideIcon
  label: string
  matchPrefix?: string
}

export interface SubType {
  to: string
  label: string
  icon: LucideIcon
  /** Si true, ouvre directement le formulaire de création au montage de la page cible */
  openCreate?: boolean
}

export interface Pillar {
  id: string
  label: string
  icon: LucideIcon
  color: string
  subTypes: SubType[]
}

export const bottomNavTabs: NavTab[] = [
  { to: '/', icon: Home, label: 'Accueil' },
  { to: '/sessions/work', icon: Dumbbell, label: 'Sessions', matchPrefix: '/sessions' },
  { to: '/stocks/inventory', icon: Package, label: 'Stocks', matchPrefix: '/stocks' },
  { to: '/tracking/recurring', icon: BarChart3, label: 'Tracking', matchPrefix: '/tracking' },
]

export const pillars: Pillar[] = [
  {
    id: 'sessions',
    label: 'Sessions',
    icon: Dumbbell,
    color: 'sessions',
    subTypes: [
      { to: '/sessions/work', label: 'Travail', icon: Timer, openCreate: true },
      { to: '/sessions/workout/programs', label: 'Musculation', icon: Dumbbell, openCreate: true },
      { to: '/sessions/cardio', label: 'Cardio', icon: Activity, openCreate: true },
    ],
  },
  {
    id: 'stocks',
    label: 'Stocks',
    icon: Package,
    color: 'stocks',
    subTypes: [
      { to: '/stocks/inventory', label: 'Inventaire', icon: Box, openCreate: true },
      { to: '/stocks/shopping', label: 'Courses', icon: ShoppingCart, openCreate: true },
      { to: '/stocks/routines', label: 'Routines', icon: RotateCcw, openCreate: true },
    ],
  },
  {
    id: 'tracking',
    label: 'Tracking',
    icon: BarChart3,
    color: 'tracking',
    subTypes: [
      { to: '/tracking/recurring', label: 'Suivi', icon: Target, openCreate: true },
      { to: '/tracking/events', label: 'Événements', icon: Calendar, openCreate: true },
      { to: '/tracking/journal', label: 'Journal', icon: BookOpen, openCreate: true },
    ],
  },
]

export const secondaryNav: NavTab[] = [
  { to: '/stats/work', icon: LineChart, label: 'Statistiques', matchPrefix: '/stats' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
  { to: '/projects', icon: FolderKanban, label: 'Projets' },
  { to: '/trash', icon: Trash2, label: 'Corbeille' },
]
