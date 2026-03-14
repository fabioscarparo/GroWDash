import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, User, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'


export default function UserAccount() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()


  const handleLogout = async () => {
    await logout()
    // Redirect will happen automatically when AuthContext updates
  }

  return (
    <div className="bg-background min-h-dvh">

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">Account</h1>
      </div>

      <div className="px-4 flex flex-col gap-3 pb-24">

        {/* User Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Account Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</label>
              <div className="text-sm font-medium text-foreground">
                {user?.username || 'Loading...'}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Appearance Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Theme</label>
              
              <div className="relative p-1 bg-muted/50 rounded-lg border border-border/50 flex">
                {/* Sliding Background */}
                <div 
                  className="absolute inset-y-1 h-auto rounded-md bg-background shadow-sm transition-all duration-300 ease-in-out z-0"
                  style={{
                    width: 'calc(33.33% - 4px)',
                    left: theme === 'light' ? '4px' : theme === 'dark' ? '33.33%' : 'calc(66.66% - 4px)',
                    transform: theme === 'dark' ? 'translateX(1.5px)' : theme === 'system' ? 'translateX(3px)' : 'none'
                  }}
                />

                {/* Options */}
                {[
                  { id: 'light',  label: 'Light',  icon: Sun },
                  { id: 'dark',   label: 'Dark',   icon: Moon },
                  { id: 'system', label: 'System', icon: Monitor },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-colors text-xs font-medium ${
                      theme === id 
                        ? 'text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Choose a fixed appearance or let GroWDash match your device's system settings.
              </p>
            </div>


          </CardContent>
        </Card>


        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full gap-2"
        >
          <LogOut size={18} />
          Logout
        </Button>

      </div>
    </div>
  )
}
