import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { LayoutGrid, ChartLine, Cpu, Settings, Sun, Moon, LogOut, User } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'history',  label: 'History',  icon: ChartLine  },
  { id: 'device',   label: 'Device',   icon: Cpu        },
  { id: 'settings', label: 'Settings', icon: Settings   },
]

export default function AppSidebar({ current, onChange, theme, onToggleTheme, user, onLogout }) {
  const handleLogout = async () => {
    await onLogout()
  }

  return (
    <Sidebar collapsible="icon">

      <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sidebar-foreground px-2 group-data-[collapsible=icon]:hidden">
            GroWDash
          </span>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={current === id}
                    onClick={() => onChange(id)}
                    tooltip={label}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-2">
        {user && (
          <SidebarMenuButton
            onClick={() => onChange('account')}
            tooltip="Account Settings"
            className="bg-sidebar-accent/50 text-sidebar-foreground"
          >
            <User size={16} className="shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {user.username}
            </span>
          </SidebarMenuButton>
        )}
        
        <SidebarMenuButton
          onClick={(e) => onToggleTheme(e)}
          tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </SidebarMenuButton>

        <SidebarMenuButton
          onClick={handleLogout}
          tooltip="Logout"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </SidebarMenuButton>
      </SidebarFooter>

    </Sidebar>
  )
}