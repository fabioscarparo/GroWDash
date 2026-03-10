import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, User } from 'lucide-react'

export default function UserAccount() {
  const { user, logout } = useAuth()

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
