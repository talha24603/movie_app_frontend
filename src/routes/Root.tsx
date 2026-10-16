import { Outlet, ScrollRestoration } from 'react-router-dom'

export function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}
