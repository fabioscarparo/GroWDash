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
import { LayoutGrid, ChartLine, Cpu, Settings, Sun, Moon } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'history',  label: 'History',  icon: ChartLine  },
  { id: 'device',   label: 'Device',   icon: Cpu        },
  { id: 'settings', label: 'Settings', icon: Settings   },
]

export default function AppSidebar({ current, onChange, theme, onToggleTheme }) {
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

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenuButton
          onClick={onToggleTheme}
          tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </SidebarMenuButton>
      </SidebarFooter>

    </Sidebar>
  )
}