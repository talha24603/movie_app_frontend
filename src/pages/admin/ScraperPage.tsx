import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Play, RefreshCw } from 'lucide-react'
import { scraperApi } from '@/api/admin'
import { queryKeys } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader, Panel } from '@/layouts/AdminLayout'
import { ScraperStatusSummary } from '@/components/admin/ScraperStatusCard'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select } from '@/components/ui/Field'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/Toast'
import { errorMessage } from '@/lib/errors'
import { categoryLabel } from '@/lib/format'
import { FLIXKISS_CATALOGS } from '@/types/admin'

const int = (min: number, max: number) => z.coerce.number({ invalid_type_error: 'Enter a number.' }).int('Whole numbers only.').min(min, `At least ${min}.`).max(max, `At most ${max}.`)

// Limits mirror BatchScrapeRequest / FawesomeScrapeRequest in app/schemas.py
const catalogSchema = z.object({
  category: z.enum(FLIXKISS_CATALOGS),
  pages: int(1, 50),
  start_page: int(1, 500),
  limit: int(1, 1000),
  skip_existing: z.boolean(),
  get_m3u8: z.boolean(),
})
const fawesomeSchema = z.object({
  limit: int(1, 20000),
  offset: int(0, 1_000_000),
  only_with_stream: z.boolean(),
  skip_existing: z.boolean(),
})
const idSchema = z.object({ id: z.string().trim().min(1, 'Enter an ID.').regex(/^[A-Za-z0-9_-]+$/, 'Letters, digits, - and _ only.') })

function useInvalidateAfterScrape() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.scraperStatus })
    qc.invalidateQueries({ queryKey: queryKeys.stats })
    qc.invalidateQueries({ queryKey: ['movies'] })
  }
}

function CatalogForm({ disabled }: { disabled: boolean }) {
  const toast = useToast()
  const invalidate = useInvalidateAfterScrape()
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof catalogSchema>>({
    resolver: zodResolver(catalogSchema),
    defaultValues: { category: 'popular', pages: 5, start_page: 1, limit: 20, skip_existing: true, get_m3u8: true },
  })
  const run = useMutation({
    mutationFn: scraperApi.catalog,
    onSuccess: (r) => {
      toast.success(r.message)
      invalidate()
    },
  })
  return (
    <form noValidate onSubmit={handleSubmit((v) => run.mutate(v))} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Catalog" error={errors.category?.message} className="sm:col-span-2">
          {(p) => (
            <Select {...p} {...register('category')}>
              {FLIXKISS_CATALOGS.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Max new movies" error={errors.limit?.message}>
          {(p) => <Input {...p} {...register('limit')} type="number" min={1} max={1000} />}
        </Field>
        <Field label="Pages to scan" error={errors.pages?.message} hint="20 movies per page">
          {(p) => <Input {...p} {...register('pages')} type="number" min={1} max={50} />}
        </Field>
        <Field label="Start page" error={errors.start_page?.message}>
          {(p) => <Input {...p} {...register('start_page')} type="number" min={1} max={500} />}
        </Field>
      </div>
      <Checkbox {...register('skip_existing')} label="Skip movies already in the database" description="Turn off to re-scrape them, e.g. to refresh expired streams." />
      <Checkbox {...register('get_m3u8')} label="Capture the .m3u8 stream" />
      {run.isError ? <p role="alert" className="text-sm text-danger">{errorMessage(run.error)}</p> : null}
      <Button type="submit" loading={run.isPending} disabled={disabled} icon={<Play className="h-4 w-4" />}>
        Start catalog scrape
      </Button>
    </form>
  )
}

function FawesomeForm({ disabled }: { disabled: boolean }) {
  const toast = useToast()
  const invalidate = useInvalidateAfterScrape()
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof fawesomeSchema>>({
    resolver: zodResolver(fawesomeSchema),
    defaultValues: { limit: 50, offset: 0, only_with_stream: true, skip_existing: true },
  })
  const run = useMutation({
    mutationFn: scraperApi.fawesomeCatalog,
    onSuccess: (r) => {
      toast.success(`${r.message} ${r.candidates_to_scan} candidates to scan.`)
      invalidate()
    },
  })
  return (
    <form noValidate onSubmit={handleSubmit((v) => run.mutate(v))} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Max new movies" error={errors.limit?.message}>
          {(p) => <Input {...p} {...register('limit')} type="number" min={1} />}
        </Field>
        <Field label="Sitemap offset" error={errors.offset?.message} hint="Skip this many entries first">
          {(p) => <Input {...p} {...register('offset')} type="number" min={0} />}
        </Field>
      </div>
      <Checkbox {...register('only_with_stream')} label="Only store movies with a playable stream" description="Many titles are geo-restricted or DRM-protected." />
      <Checkbox {...register('skip_existing')} label="Skip movies already stored with a stream" />
      {run.isError ? <p role="alert" className="text-sm text-danger">{errorMessage(run.error)}</p> : null}
      <Button type="submit" loading={run.isPending} disabled={disabled} icon={<Play className="h-4 w-4" />}>
        Start Fawesome scrape
      </Button>
    </form>
  )
}

function SingleScrapeForm({ kind }: { kind: 'flixkiss' | 'fawesome' }) {
  const toast = useToast()
  const invalidate = useInvalidateAfterScrape()
  const [lastResult, setLastResult] = useState<{ id: string; title?: string } | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof idSchema>>({ resolver: zodResolver(idSchema), defaultValues: { id: '' } })
  const run = useMutation({
    mutationFn: ({ id }: { id: string }) => (kind === 'flixkiss' ? scraperApi.movie(id) : scraperApi.fawesomeMovie(id)),
    onSuccess: (r, { id }) => {
      setLastResult({ id, title: r.movie?.title })
      toast.success(`Scraped “${r.movie?.title ?? id}”.`)
      invalidate()
    },
  })
  return (
    <form noValidate onSubmit={handleSubmit((v) => run.mutate(v))} className="space-y-3">
      <Field label={kind === 'flixkiss' ? 'TMDB movie ID' : 'Fawesome movie ID'} error={errors.id?.message} hint={kind === 'flixkiss' ? 'TV shows and series are rejected. Takes up to a minute.' : undefined}>
        {(p) => (
          <div className="flex gap-2">
            <Input {...p} {...register('id')} placeholder={kind === 'flixkiss' ? 'e.g. 1423191' : 'e.g. 10844132'} className="font-mono" />
            <Button type="submit" variant="secondary" loading={run.isPending}>
              Scrape
            </Button>
          </div>
        )}
      </Field>
      {run.isError ? <p role="alert" className="text-sm text-danger">{errorMessage(run.error)}</p> : null}
      {lastResult && !run.isPending && !run.isError ? (
        <p className="text-sm text-fg-muted">
          Saved{' '}
          <Link to={`/admin/movies/${encodeURIComponent(lastResult.id)}`} className="text-fg underline underline-offset-4 hover:text-white">
            {lastResult.title ?? lastResult.id}
          </Link>
          .
        </p>
      ) : null}
    </form>
  )
}

export function ScraperPage() {
  useDocumentTitle('Scraper')
  const status = useQuery({
    queryKey: queryKeys.scraperStatus,
    queryFn: ({ signal }) => scraperApi.status(signal),
    refetchInterval: (q) => (q.state.data?.is_running ? 2000 : 10000),
  })
  const running = Boolean(status.data?.is_running)
  const errors = status.data?.errors ?? []

  return (
    <>
      <PageHeader
        title="Scraper"
        description="Import movies from FlixKiss (TMDB catalogs) and Fawesome. One batch scrape runs at a time."
        actions={
          <Button variant="outline" size="sm" onClick={() => status.refetch()} loading={status.isFetching} icon={<RefreshCw className="h-4 w-4" />}>
            Refresh
          </Button>
        }
      />

      <div className="space-y-6">
        <Panel title="Status">
          {status.isError ? (
            <ErrorState compact title="Could not load scraper status" error={status.error} onRetry={() => status.refetch()} />
          ) : status.data ? (
            <ScraperStatusSummary state={status.data} />
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
          <p className="mt-4 text-xs text-fg-subtle">Progress is kept in the API process memory and resets when the API restarts.</p>
        </Panel>

        {errors.length ? (
          <Panel title={`Errors from the last run (${errors.length})`}>
            <ul className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto text-sm">
              {errors.map((e, i) => (
                <li key={i} className="flex gap-2 rounded-lg bg-ink-850 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-fg-subtle">{e.tmdb_id ? `ID ${e.tmdb_id}` : e.url}</p>
                    <p className="break-words text-fg-muted">{e.error}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {running ? (
          <p role="status" className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
            A batch scrape is running. New batch scrapes are disabled until it finishes.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="FlixKiss catalog">
            <CatalogForm disabled={running} />
          </Panel>
          <Panel title="Fawesome catalog">
            <FawesomeForm disabled={running} />
          </Panel>
          <Panel title="Single FlixKiss movie">
            <SingleScrapeForm kind="flixkiss" />
          </Panel>
          <Panel title="Single Fawesome movie">
            <SingleScrapeForm kind="fawesome" />
          </Panel>
        </div>
      </div>
    </>
  )
}
