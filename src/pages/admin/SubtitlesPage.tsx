import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, RefreshCw, RotateCcw } from 'lucide-react'
import { subtitleJobsApi, type SubtitleJobQuery } from '@/api/admin'
import { queryKeys } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader } from '@/layouts/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select } from '@/components/ui/Field'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Dialog } from '@/components/ui/Dialog'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { errorMessage } from '@/lib/errors'
import { cn, formatNumber, formatRelative, sourceLabel } from '@/lib/format'
import type { SubtitleJob, SubtitleJobStatus } from '@/types/admin'

const PAGE_SIZE = 25
const STATUS_TONE: Record<SubtitleJobStatus, 'neutral' | 'info' | 'ok' | 'danger'> = { queued: 'neutral', running: 'info', completed: 'ok', failed: 'danger' }

// Why an explicitly requested movie was not queued (app/services/subtitle_jobs.py::_diagnose)
const SKIP_REASONS: Record<string, string> = {
  subtitle_exists: 'already generated',
  scraped_subtitle_exists: 'already scraped',
  already_queued: 'already queued',
  no_stream_url: 'no stream',
  not_found: 'not found',
  source_mismatch: 'other source',
}

// Subset of Whisper languages; codes match LANGUAGE_NAMES in app/services/subtitle_tracks.py
const LANGUAGES = [
  ['en', 'English'], ['ur', 'Urdu'], ['ar', 'Arabic'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'],
  ['hi', 'Hindi'], ['pt', 'Portuguese'], ['ru', 'Russian'], ['it', 'Italian'], ['tr', 'Turkish'], ['zh', 'Chinese'],
  ['ja', 'Japanese'], ['ko', 'Korean'], ['fa', 'Persian'], ['bn', 'Bengali'], ['nl', 'Dutch'], ['pl', 'Polish'],
  ['id', 'Indonesian'],
] as const

function LanguageOptions() {
  return (
    <>
      {LANGUAGES.map(([code, name]) => (
        <option key={code} value={code}>
          {name} ({code})
        </option>
      ))}
    </>
  )
}

// Mirrors SubtitleJobCreate in app/schemas.py
const createSchema = z
  .object({
    source: z.enum(['all', 'flixkiss', 'fawesome']),
    language: z.string().trim().toLowerCase().regex(/^[a-z]{2,3}$/, 'Use an ISO 639-1 code, e.g. en, ur, es.'),
    limit: z.coerce.number().int().min(1, 'At least 1.').max(500, 'At most 500.'),
    movie_ids: z.string(),
    retry_failed: z.boolean(),
  })

function CreateBatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { source: 'all', language: 'en', limit: 20, movie_ids: '', retry_failed: false },
  })
  const create = useMutation({
    mutationFn: (v: z.infer<typeof createSchema>) =>
      subtitleJobsApi.create({
        source: v.source,
        language: v.language,
        limit: v.limit,
        offset: 0,
        retry_failed: v.retry_failed,
        movie_ids: v.movie_ids.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: (r) => {
      const reasons = [...new Set(Object.values(r.skipped_details ?? {}))].map((c) => SKIP_REASONS[c] ?? c.replace(/_/g, ' '))
      toast.success(`Batch ${r.batch_id}: ${r.queued} queued, ${r.skipped} skipped${reasons.length ? ` (${reasons.join(', ')})` : ''}.`)
      qc.invalidateQueries({ queryKey: ['admin', 'subtitle-jobs'] })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      reset()
      onClose()
    },
  })

  return (
    <Dialog
      open={open}
      onClose={() => !create.isPending && onClose()}
      title="Queue subtitle generation"
      description="Movies that already have a scraped or generated subtitle in this language are skipped."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-subtitle-batch" loading={create.isPending}>
            Queue jobs
          </Button>
        </>
      }
    >
      <form id="create-subtitle-batch" noValidate onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Source" error={errors.source?.message}>
            {(p) => (
              <Select {...p} {...register('source')}>
                <option value="all">All sources</option>
                <option value="flixkiss">FlixKiss</option>
                <option value="fawesome">Fawesome</option>
              </Select>
            )}
          </Field>
          <Field label="Language" error={errors.language?.message}>
            {(p) => (
              <Select {...p} {...register('language')}>
                <LanguageOptions />
              </Select>
            )}
          </Field>
          <Field label="Max movies" error={errors.limit?.message}>
            {(p) => <Input {...p} {...register('limit')} type="number" min={1} max={500} />}
          </Field>
        </div>
        <Field label="Only these movie IDs (optional)" error={errors.movie_ids?.message} hint="Separate IDs with commas or spaces.">
          {(p) => <Input {...p} {...register('movie_ids')} className="font-mono" />}
        </Field>
        <Checkbox {...register('retry_failed')} label="Only movies whose last job for this language failed" />
        {create.isError ? <p role="alert" className="text-sm text-danger">{errorMessage(create.error)}</p> : null}
      </form>
    </Dialog>
  )
}

export function SubtitlesPage() {
  useDocumentTitle('Subtitle jobs')
  const toast = useToast()
  const qc = useQueryClient()
  const [filters, setFilters] = useState<SubtitleJobQuery>({ page: 1, limit: PAGE_SIZE })
  const [creating, setCreating] = useState(false)

  const jobs = useQuery({
    queryKey: queryKeys.subtitleJobs(filters),
    queryFn: ({ signal }) => subtitleJobsApi.list(filters, signal),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.jobs.some((j) => j.status === 'running' || j.status === 'queued') ? 4000 : 20000),
  })

  const retry = useMutation({
    mutationFn: (j: SubtitleJob) => subtitleJobsApi.retry(j.id),
    onSuccess: (j) => {
      toast.success(`Job ${j.id} requeued.`)
      qc.invalidateQueries({ queryKey: ['admin', 'subtitle-jobs'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const set = (patch: SubtitleJobQuery) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }))
  const data = jobs.data

  return (
    <>
      <PageHeader
        title="Subtitle jobs"
        description="AI subtitle generation (FFmpeg + Whisper) runs in the API's background workers."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => jobs.refetch()} loading={jobs.isFetching} icon={<RefreshCw className="h-4 w-4" />}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => setCreating(true)} icon={<Plus className="h-4 w-4" />}>
              Queue jobs
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select aria-label="Status" value={filters.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })} className="w-auto">
          <option value="">All statuses</option>
          {(['queued', 'running', 'completed', 'failed'] as const).map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        <Select aria-label="Source" value={filters.source ?? ''} onChange={(e) => set({ source: e.target.value || undefined })} className="w-auto">
          <option value="">All sources</option>
          <option value="flixkiss">FlixKiss</option>
          <option value="fawesome">Fawesome</option>
        </Select>
        <Select aria-label="Language" value={filters.language ?? ''} onChange={(e) => set({ language: e.target.value || undefined })} className="w-auto">
          <option value="">All languages</option>
          <LanguageOptions />
        </Select>
      </div>

      {jobs.isError ? (
        <ErrorState title="Could not load jobs" error={jobs.error} onRetry={() => jobs.refetch()} />
      ) : !data ? (
        <Skeleton className="h-64 w-full rounded-card" />
      ) : data.jobs.length === 0 ? (
        <EmptyState title="No subtitle jobs" description="Queue a batch to generate subtitles for movies with a stream." />
      ) : (
        <div className="overflow-hidden rounded-card border border-ink-700 bg-ink-900">
          <div className="scrollbar-thin overflow-x-auto">
            <table className={cn('w-full min-w-[820px] text-left text-sm', jobs.isPlaceholderData && 'opacity-60')}>
              <thead className="border-b border-ink-700 bg-ink-850 text-xs uppercase tracking-wider text-fg-subtle">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3 font-medium">Job</th>
                  <th scope="col" className="px-3 py-3 font-medium">Movie</th>
                  <th scope="col" className="px-3 py-3 font-medium">Language</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Progress</th>
                  <th scope="col" className="px-3 py-3 font-medium">Created</th>
                  <th scope="col" className="px-3 py-3 pr-4 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {data.jobs.map((j) => (
                  <tr key={j.id} className="align-top">
                    <td className="py-3 pl-4 pr-3 font-mono text-xs text-fg-muted">
                      #{j.id}
                      {j.batch_id ? <span className="block text-fg-subtle">batch {j.batch_id}</span> : null}
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/admin/movies/${encodeURIComponent(j.movie_tmdb_id)}`} className="font-mono text-xs text-fg hover:text-white">
                        {j.movie_tmdb_id}
                      </Link>
                      <span className="block text-xs text-fg-subtle">{sourceLabel(j.source)}</span>
                    </td>
                    <td className="px-3 py-3 uppercase text-fg-muted">
                      {j.language} <span className="block text-xs normal-case text-fg-subtle">{j.mode}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={STATUS_TONE[j.status]}>{j.status}</Badge>
                      {j.error_code ? (
                        <p className="mt-1 max-w-xs text-xs text-red-300" title={j.error_message ?? undefined}>
                          {j.error_code}
                          {j.error_message ? <span className="block text-fg-subtle">{j.error_message}</span> : null}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {j.status === 'running' ? (
                        <div className="w-32">
                          <div className="mb-1 flex justify-between text-xs text-fg-muted">
                            <span>{j.stage?.replace(/_/g, ' ') ?? 'starting'}</span>
                            <span className="tabular-nums">{Math.round(j.progress)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-ink-700">
                            <div className="h-1.5 rounded-full bg-sky-400" style={{ width: `${j.progress}%` }} />
                          </div>
                        </div>
                      ) : j.status === 'completed' && j.stage === 'skipped_existing' ? (
                        <span className="text-xs text-fg-subtle">Skipped – subtitle already exists</span>
                      ) : (
                        <span className="text-xs text-fg-subtle">{j.attempts} attempt{j.attempts === 1 ? '' : 's'}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-fg-muted">{formatRelative(j.created_at)}</td>
                    <td className="px-3 py-3 pr-4 text-right">
                      {j.status === 'failed' ? (
                        <Button variant="outline" size="sm" onClick={() => retry.mutate(j)} loading={retry.isPending && retry.variables?.id === j.id} icon={<RotateCcw className="h-3.5 w-3.5" />}>
                          Retry
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-700 px-4 py-3 text-sm text-fg-muted sm:flex-row">
            <span>{formatNumber(data.total)} jobs</span>
            <Pagination page={data.page} totalPages={Math.ceil(data.total / data.limit)} onChange={(p) => set({ page: p })} />
          </div>
        </div>
      )}

      <CreateBatchDialog open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
