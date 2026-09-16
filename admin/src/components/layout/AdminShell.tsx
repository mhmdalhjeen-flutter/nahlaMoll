'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Truck,
  Settings,
  CreditCard,
  Megaphone,
  MessageCircle,
  Star,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAdminAuth } from '@/stores/auth-store';
import { useToast } from '@/stores/toast-store';

function cls(...args: (string | boolean | undefined)[]) {
  return args.filter(Boolean).join(' ');
}

const nav = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/products', label: 'المنتجات', icon: Package },
  { href: '/categories', label: 'التصنيفات', icon: FolderTree },
  { href: '/orders', label: 'الطلبات', icon: ShoppingBag },
  { href: '/delivery', label: 'مناطق التوصيل', icon: Truck },
  { href: '/settings', label: 'إعدادات المتجر', icon: Settings },
  { href: '/payment', label: 'الدفع', icon: CreditCard },
  { href: '/announcements', label: 'الإعلانات', icon: Megaphone },
  { href: '/support', label: 'الدعم', icon: MessageCircle },
  { href: '/reviews', label: 'التقييمات', icon: Star },
  { href: '/analytics', label: 'التحليلات', icon: BarChart3 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, email } = useAdminAuth();
  const toast = useToast((s) => s.show);
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast('تم تسجيل الخروج', 'info');
    router.push('/login');
  };

  const NavLinks = () => (
    <>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={cls(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
            pathname.startsWith(href)
              ? 'bg-primary-100 text-primary-800 font-medium'
              : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          <Icon className="w-5 h-5 shrink-0" />
          {label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-l border-gray-200 p-4">
        <div className="font-bold text-lg text-primary-700 mb-6 px-2">لوحة الإدارة</div>
        <nav className="flex-1 space-y-1 overflow-y-auto"><NavLinks /></nav>
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500 px-2 mb-2 truncate">{email}</p>
          <button type="button" onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error-600 hover:bg-error-50 rounded-xl">
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cls(
          'fixed inset-y-0 right-0 z-50 w-64 bg-white p-4 transform transition-transform lg:hidden',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-primary-700">القائمة</span>
          <button type="button" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="space-y-1"><NavLinks /></nav>
      </aside>

      <div className="flex-1 lg:mr-64">
        <header className="sticky top-0 z-30 bg-white border-b px-4 h-14 flex items-center justify-between">
          <button type="button" className="lg:hidden p-2" onClick={() => setOpen(true)}><Menu className="w-6 h-6" /></button>
          <h1 className="text-sm font-medium text-gray-700">إدارة المتجر</h1>
          <button type="button" className="lg:hidden text-sm text-error-600" onClick={handleLogout}>خروج</button>
        </header>
        <main className="p-3 sm:p-4 md:p-6 overflow-x-hidden max-w-full">{children}</main>
      </div>
    </div>
  );
}
