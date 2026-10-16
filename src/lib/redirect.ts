/** Only allow same-app admin paths as post-login redirect targets (prevents open redirects). */
export function safeNext(next: string | null): string {
  if (next && next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/login')) return next
  return '/admin'
}
