/**
 * AppSidebar.jsx — Desktop navigation and sidebar container.
 * 
 * Provides the primary navigation structure for desktop users, 
 * including page switching, theme toggling, and user account management.
 * Built using shadcn/ui Sidebar primitives.
 */

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

import { LayoutGrid, ChartLine, Cpu, Settings, Sun, Moon, LogOut, User } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'history', label: 'History', icon: ChartLine },
  { id: 'device', label: 'Device', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: Settings },
]

/**
 * AppSidebar component provides the primary vertical navigation structure for desktop layouts.
 * Uses shadcn/ui Sidebar primitives to render a collapsible sidebar encompassing page links,
 * theme toggling, and user account actions.
 *
 * @component
 * @param {object} props - The component properties.
 * @param {string} props.current - The ID identifier of the currently active navigational page (e.g., 'overview').
 * @param {function(string): void} props.onChange - Callback fired when a navigation menu item is clicked. Passed the target page string ID.
 * @param {string} props.theme - The current theme mode of the application ('light' or 'dark').
 * @param {function(React.MouseEvent): void} props.onToggleTheme - Callback to request a theme toggle, passing the click event to anchor transition animations.
 * @param {object} [props.user] - The authenticated user's session data.
 * @param {function(): Promise<void>} props.onLogout - Asynchronous callback invoked to initiate the sign-out process.
 * @returns {JSX.Element} A fully functional and collapsible sidebar.
 */
export default function AppSidebar({ current, onChange, theme, onToggleTheme, user, onLogout }) {
  /**
   * Internal asynchronous handler that invokes the `onLogout` prop when the user initiates a sign-out.
   * 
   * @async
   * @function handleLogout
   * @returns {Promise<void>} Resolves when the logout sequence completes.
   */
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