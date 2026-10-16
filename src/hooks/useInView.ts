import { useEffect, useRef, useState } from 'react'

/** True once the element has come within `rootMargin` of the viewport (stays true). Used to lazy-load rows. */
export function useInViewOnce<T extends Element>(rootMargin = '300px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (inView || !ref.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return { ref, inView }
}
