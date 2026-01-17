import { 
  LayoutDashboard, 
  BarChart3, 
  Upload, 
  Clock, 
  GitBranch, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { id: 'full-view', label: 'Full View', icon: LayoutDashboard },
  { id: 'quality-view', label: 'Quality Analysis', icon: BarChart3 },
  { id: 'mis-upload', label: 'MIS Upload', icon: Upload },
  { id: 'data-freshness', label: 'Data Freshness', icon: Clock },
  { id: 'stpk-vkyc', label: 'STPK / VKYC', icon: GitBranch },
  { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
];

export function AppSidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }: AppSidebarProps) {
  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar-background border-r border-sidebar-border flex flex-col transition-all duration-200",
        collapsed ? "w-14" : "w-52"
      )}
    >
      {/* Logo/Brand */}
      <div className="h-12 flex items-center px-3 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-sidebar-foreground">Axis Bank</span>
              <span className="text-[10px] text-muted-foreground">Card Conversion</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-primary font-medium" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
