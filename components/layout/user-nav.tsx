// components/layout/user-nav.tsx
'use client'

import { useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut } from 'lucide-react'

export function UserNav() {
  const { data: session } = useSession()
  const username = session?.user?.username ?? 'User'
  const email = session?.user?.email ?? ''
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }
  const openNow = () => {
    cancelClose()
    setOpen(true)
  }

  return (
    <div onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border bg-muted text-foreground hover:bg-accent hover:text-accent-foreground p-0"
            aria-label="User menu"
          >
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-48"
          align="end"
          forceMount
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        >
          <DropdownMenuLabel className="font-normal p-2">
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-medium leading-none">{username}</p>
              <p className="text-[10px] leading-none text-muted-foreground">
                {email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs py-1.5" onClick={() => signOut()}>
            <LogOut className="mr-2 h-3 w-3" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
