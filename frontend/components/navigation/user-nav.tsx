'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Settings, LogOut, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function UserNav() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="flex items-center justify-between" disabled>
            <div className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              <span>Роль</span>
            </div>
            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
              {user.role === 'ADMIN' ? 'Администратор' : 'Менеджер'}
            </Badge>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Профиль</span>
            </Link>
          </DropdownMenuItem>
          {user.role === 'ADMIN' && (
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Настройки</span>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
