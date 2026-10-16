import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type HlsType from 'hls.js'
import type { ErrorData, Level } from 'hls.js'
import {
  AlertTriangle, Captions, Check, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Settings, Volume1, Volume2, VolumeX,
} from 'lucide-react'
import { API_BASE } from '@/api/client'
import { cn, formatClock } from '@/lib/format'
import type { PlayerTrack, StreamCandidate } from '@/lib/media'
import { Spinner } from '@/components/ui/Spinner'

interface VideoPlayerProps {
  sources: StreamCandidate[]
  tracks?: PlayerTrack[]
  poster?: string
  title: string
  autoPlay?: boolean
}

type Menu = null | 'settings'

const HLS_TYPE = 'application/vnd.apple.mpegurl'

function describeHlsError(data: ErrorData): string {
  const d = String(data.details)
  if (d.startsWith('manifest')) return 'The stream could not be loaded. The source may have expired or be temporarily unavailable.'
  if (d.startsWith('frag') || d.startsWith('level')) return 'The stream stopped responding while loading video.'
  if (data.type === 'mediaError') return 'This video could not be decoded by your browser.'
  return 'Playback failed because of a network problem.'
}

function levelLabel(level: Level): string {
  if (level.height) return `${level.height}p`
  if (level.bitrate) return `${(level.bitrate / 1e6).toFixed(1)} Mbps`
  return 'Level'
}

export function VideoPlayer({ sources, tracks = [], poster, title, autoPlay = false }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<HlsType | null>(null)
  const trackEls = useRef<Array<HTMLTrackElement | null>>([])
  const hideTimer = useRef<number | undefined>(undefined)

  const [sourceIndex, setSourceIndex] = useState(0)
  const [attempt, setAttempt] = useState(0) // bump to reload after an error
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [waiting, setWaiting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [menu, setMenu] = useState<Menu>(null)
  const [levels, setLevels] = useState<Level[]>([])
  const [level, setLevel] = useState(-1)
  const [subtitle, setSubtitle] = useState(-1)

  const source = sources[sourceIndex]

  // ── Source attachment ──────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !source) return
    let cancelled = false
    setError(null)
    setWaiting(true)
    setLevels([])
    setLevel(-1)

    const fallbackOrFail = (message: string) => {
      if (cancelled) return
      if (sourceIndex < sources.length - 1) setSourceIndex((i) => i + 1)
      else {
        setError(message)
        setWaiting(false)
      }
    }

    const tryPlay = () => {
      if (autoPlay || started) {
        video.play().catch(() => {
          // Autoplay blocked by the browser: fall back to the big play button
          setPlaying(false)
          setStarted(false)
          setWaiting(false)
        })
      }
    }

    const attach = async () => {
      // Safari/iOS play HLS natively; elsewhere use hls.js (loaded on demand, ~150 KB)
      const nativeHls = video.canPlayType(HLS_TYPE) !== ''
      const { default: Hls } = await import('hls.js/light')
      if (cancelled) return
      if (Hls.isSupported()) {
        // Without autoplay only the manifest is fetched until the viewer presses play (saves proxy bandwidth)
        const hls = new Hls({ enableWorker: true, backBufferLength: 60, autoStartLoad: autoPlay || started })
        hlsRef.current = hls
        let recoveredMedia = false
        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          setLevels(data.levels)
          tryPlay()
        })
        hls.on(Hls.Events.LEVEL_SWITCHED, () => setLevel(hls.autoLevelEnabled ? -1 : hls.currentLevel))
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recoveredMedia) {
            recoveredMedia = true
            hls.recoverMediaError()
            return
          }
          hls.destroy()
          hlsRef.current = null
          fallbackOrFail(describeHlsError(data))
        })
        hls.loadSource(source.url)
        hls.attachMedia(video)
      } else if (nativeHls) {
        video.src = source.url
        tryPlay()
      } else {
        setError('Your browser cannot play this stream format (HLS).')
        setWaiting(false)
      }
    }

    const onNativeError = () => {
      if (!hlsRef.current) fallbackOrFail('The stream could not be played. The source may have expired.')
    }
    video.addEventListener('error', onNativeError)
    attach()

    return () => {
      cancelled = true
      video.removeEventListener('error', onNativeError)
      hlsRef.current?.destroy()
      hlsRef.current = null
      video.removeAttribute('src')
      video.load()
    }
    // `started`/`autoPlay` only matter at attach time; re-attaching on them would restart playback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.url, attempt])

  // ── Media element events ───────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const handlers: Record<string, () => void> = {
      play: () => {
        setPlaying(true)
        setStarted(true)
      },
      pause: () => setPlaying(false),
      waiting: () => setWaiting(true),
      playing: () => setWaiting(false),
      canplay: () => setWaiting(false),
      loadedmetadata: () => setDuration(Number.isFinite(v.duration) ? v.duration : 0),
      durationchange: () => setDuration(Number.isFinite(v.duration) ? v.duration : 0),
      timeupdate: () => setTime(v.currentTime),
      progress: () => {
        const b = v.buffered
        setBuffered(b.length ? b.end(b.length - 1) : 0)
      },
      volumechange: () => {
        setVolume(v.volume)
        setMuted(v.muted)
      },
      ended: () => setPlaying(false),
    }
    Object.entries(handlers).forEach(([ev, fn]) => v.addEventListener(ev, fn))
    return () => Object.entries(handlers).forEach(([ev, fn]) => v.removeEventListener(ev, fn))
  }, [])

  // ── Subtitles: drive our own <track> elements so HLS-embedded tracks can't shift indexes ──
  useEffect(() => {
    trackEls.current.forEach((el, i) => {
      if (el?.track) el.track.mode = i === subtitle ? 'showing' : 'disabled'
    })
  }, [subtitle, tracks])

  // ── Fullscreen state ───────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ── Controls auto-hide ─────────────────────────────────────────────────────
  const revealControls = useCallback(() => {
    setControlsVisible(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2800)
  }, [])
  useEffect(() => () => window.clearTimeout(hideTimer.current), [])
  const showControls = controlsVisible || !playing || menu !== null || Boolean(error)

  // ── Actions ────────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v || error) return
    if (v.paused || v.ended) {
      setStarted(true)
      const hls = hlsRef.current
      if (hls && !hls.config.autoStartLoad && !hls.loadingEnabled) hls.startLoad()
      v.play().catch(() => setPlaying(false))
    } else v.pause()
  }, [error])

  const seekTo = (t: number) => {
    const v = videoRef.current
    if (!v || !duration) return
    v.currentTime = Math.max(0, Math.min(duration, t))
  }
  const seekBy = (delta: number) => seekTo((videoRef.current?.currentTime ?? 0) + delta)

  const setVol = (val: number) => {
    const v = videoRef.current
    if (!v) return
    v.volume = Math.max(0, Math.min(1, val))
    v.muted = v.volume === 0
  }
  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    if (!v.muted && v.volume === 0) v.volume = 0.5
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
    else v?.webkitEnterFullscreen?.() // iOS Safari: only the video element can go fullscreen
  }

  const chooseLevel = (i: number) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = i // -1 = automatic
    setLevel(i)
  }

  const retry = () => {
    setError(null)
    setSourceIndex(0)
    setAttempt((a) => a + 1)
  }

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, select, [role="menu"]')) return
    const handled = true
    switch (e.key) {
      case ' ':
      case 'k':
        togglePlay()
        break
      case 'ArrowRight':
        seekBy(10)
        break
      case 'ArrowLeft':
        seekBy(-10)
        break
      case 'ArrowUp':
        setVol(volume + 0.1)
        break
      case 'ArrowDown':
        setVol(volume - 0.1)
        break
      case 'm':
        toggleMute()
        break
      case 'f':
        toggleFullscreen()
        break
      case 'c':
        if (tracks.length) setSubtitle((s) => (s === -1 ? 0 : -1))
        break
      case 'Escape':
        setMenu(null)
        break
      default:
        return
    }
    if (handled) {
      e.preventDefault()
      revealControls()
    }
  }

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const pct = (n: number) => (duration ? Math.min(100, (n / duration) * 100) : 0)
  const iconBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 hover:text-white'

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      className={cn('group relative aspect-video w-full overflow-hidden bg-black outline-none', fullscreen ? '' : 'rounded-xl', showControls ? '' : 'cursor-none')}
      aria-label={`Video player: ${title}`}
      role="region"
    >
      <video
        ref={videoRef}
        className="h-full w-full bg-black"
        poster={poster || undefined}
        playsInline
        preload="metadata"
        crossOrigin={API_BASE ? 'anonymous' : undefined}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      >
        {tracks.map((t, i) => (
          <track
            key={t.src}
            ref={(el) => {
              trackEls.current[i] = el
            }}
            kind="subtitles"
            src={t.src}
            label={t.label}
            srcLang={t.srcLang}
          />
        ))}
      </video>

      {/* Center states */}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center" role="alert">
          <AlertTriangle className="h-10 w-10 text-danger" aria-hidden="true" />
          <div>
            <p className="font-semibold text-white">Playback error</p>
            <p className="mt-1 max-w-md text-sm text-white/70">{error}</p>
          </div>
          <button type="button" onClick={retry} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25">
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      ) : waiting && (started || autoPlay) ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Spinner className="h-12 w-12 text-white/90" label="Loading video" />
        </div>
      ) : !started && !playing ? (
        <button type="button" onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/25" aria-label={`Play ${title}`}>
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600/95 text-white shadow-2xl transition-transform hover:scale-105">
            <Play className="ml-1 h-9 w-9 fill-current" />
          </span>
        </button>
      ) : null}

      {/* Control bar (hidden until playback starts; the big play button covers that state) */}
      {!error && (started || playing) ? (
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2 pt-12 transition-opacity duration-300 sm:px-4',
            showControls ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          {/* Seek bar */}
          <div className="relative mx-1 flex h-4 items-center">
            <div className="absolute inset-x-0 h-1 rounded-full bg-white/20" />
            <div className="absolute h-1 rounded-full bg-white/35" style={{ width: `${pct(buffered)}%` }} />
            <div className="absolute h-1 rounded-full bg-brand-500" style={{ width: `${pct(time)}%` }} />
            <input
              type="range"
              className="range relative h-4 w-full"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(time, duration || 0)}
              onChange={(e) => seekTo(Number(e.target.value))}
              disabled={!duration}
              aria-label="Seek"
              aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
            />
          </div>

          <div className="mt-1 flex items-center gap-1 text-white">
            <button type="button" className={iconBtn} onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <button type="button" className={cn(iconBtn, 'hidden sm:inline-flex')} onClick={() => seekBy(-10)} aria-label="Back 10 seconds">
              <RotateCcw className="h-5 w-5" />
            </button>
            <button type="button" className={cn(iconBtn, 'hidden sm:inline-flex')} onClick={() => seekBy(10)} aria-label="Forward 10 seconds">
              <RotateCw className="h-5 w-5" />
            </button>

            <div className="group/vol flex items-center">
              <button type="button" className={iconBtn} onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                <VolumeIcon className="h-5 w-5" />
              </button>
              <div className="relative hidden h-4 w-0 items-center overflow-hidden transition-all duration-200 group-hover/vol:w-24 group-focus-within/vol:w-24 sm:flex">
                <div className="absolute inset-x-1 h-1 rounded-full bg-white/25" />
                <div className="absolute left-1 h-1 rounded-full bg-white" style={{ width: `calc(${(muted ? 0 : volume) * 100}% - 0.5rem)` }} />
                <input
                  type="range"
                  className="range relative mx-1 h-4 w-full"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => setVol(Number(e.target.value))}
                  aria-label="Volume"
                />
              </div>
            </div>

            <span className="ml-2 select-none whitespace-nowrap text-xs tabular-nums text-white/85 sm:text-sm">
              {formatClock(time)} <span className="text-white/45">/ {formatClock(duration)}</span>
            </span>

            <div className="ml-auto flex items-center gap-1">
              {tracks.length ? (
                <button
                  type="button"
                  className={cn(iconBtn, subtitle >= 0 && 'text-brand-400')}
                  onClick={() => setSubtitle((s) => (s === -1 ? 0 : -1))}
                  aria-label={subtitle >= 0 ? 'Turn off subtitles' : 'Turn on subtitles'}
                  aria-pressed={subtitle >= 0}
                >
                  <Captions className="h-5 w-5" />
                </button>
              ) : null}

              {levels.length > 1 || tracks.length ? (
                <div className="relative">
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => setMenu((m) => (m ? null : 'settings'))}
                    aria-label="Playback settings"
                    aria-haspopup="menu"
                    aria-expanded={menu === 'settings'}
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  {menu === 'settings' ? (
                    <div role="menu" className="scrollbar-thin absolute bottom-12 right-0 max-h-72 w-60 overflow-y-auto rounded-xl border border-white/10 bg-ink-900/95 p-2 text-sm shadow-2xl backdrop-blur">
                      {levels.length > 1 ? (
                        <>
                          <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-white/50">Quality</p>
                          {[-1, ...levels.map((_, i) => i).sort((a, b) => (levels[b].bitrate ?? 0) - (levels[a].bitrate ?? 0))].map((i) => (
                            <MenuItem key={`q${i}`} selected={level === i} onClick={() => chooseLevel(i)}>
                              {i === -1 ? 'Auto' : levelLabel(levels[i])}
                            </MenuItem>
                          ))}
                        </>
                      ) : null}
                      {tracks.length ? (
                        <>
                          <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-white/50">Subtitles</p>
                          <MenuItem selected={subtitle === -1} onClick={() => setSubtitle(-1)}>
                            Off
                          </MenuItem>
                          {tracks.map((t, i) => (
                            <MenuItem key={t.src} selected={subtitle === i} onClick={() => setSubtitle(i)}>
                              {t.label}
                            </MenuItem>
                          ))}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <button type="button" className={iconBtn} onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MenuItem({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className={cn('flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white/10', selected ? 'text-white' : 'text-white/75')}
    >
      <span className="truncate">{children}</span>
      {selected ? <Check className="h-4 w-4 shrink-0 text-brand-400" /> : null}
    </button>
  )
}
