import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, EyeOff, ExternalLink, Info, Save, Trash2 } from 'lucide-react'
import { ApiError } from '@/api/client'
import { adminApi } from '@/api/admin'
import { queryKeys, useFacets, useMovie } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageHeader, Panel } from '@/layouts/AdminLayout'
import { Artwork } from '@/components/movies/Artwork'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { TagInput } from '@/components/ui/TagInput'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { errorMessage } from '@/lib/errors'
import { formatDate, hasStream, sourceLabel } from '@/lib/format'
import type { Movie } from '@/types/movie'
import type { MovieUpdate } from '@/types/admin'

// Mirrors the server-side rules in app/schemas.py (MovieUpdate); the server remains the authority.
const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'Must be an http(s) URL.')

const movieSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(512),
  year: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{4}$/.test(v), 'Use four digits, e.g. 2024.'),
  rating: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+(\.\d+)?$/.test(v) && Number(v) <= 10), 'A number from 0 to 10.'),
  runtime: z.string().trim().max(32),
  description: z.string().max(20000),
  genres: z.array(z.string().min(1).max(64)).max(30),
  categories: z.array(z.string().regex(/^[a-z0-9_]{1,32}$/, 'Use lowercase letters, digits and _')).max(30),
  poster_url: optionalUrl,
  backdrop_url: optionalUrl,
  logo_url: optionalUrl,
})
type FormValues = z.infer<typeof movieSchema>

function toForm(m: Movie): FormValues {
  return {
    title: m.title,
    year: m.year,
    rating: m.rating,
    runtime: m.runtime,
    description: m.description,
    genres: m.genres,
    categories: m.categories,
    poster_url: m.poster_url,
    backdrop_url: m.backdrop_url,
    logo_url: m.logo_url,
  }
}

const SERVER_FIELDS = new Set(Object.keys(movieSchema.shape))

export function MovieEditPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const movieQuery = useMovie(id)
  const facets = useFacets()
  const movie = movieQuery.data
  useDocumentTitle(movie ? `Edit ${movie.title}` : 'Edit movie')

  const form = useForm<FormValues>({ resolver: zodResolver(movieSchema) })
  const { register, handleSubmit, control, reset, setError, watch, formState } = form
  const { errors, isDirty, dirtyFields } = formState

  useEffect(() => {
    if (movie) reset(toForm(movie))
  }, [movie, reset])

  const save = useMutation({
    mutationFn: (body: MovieUpdate) => adminApi.updateMovie(id, body),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.movie(id), updated)
      qc.invalidateQueries({ queryKey: ['movies', 'list'] })
      qc.invalidateQueries({ queryKey: queryKeys.facets })
      reset(toForm(updated))
      toast.success('Changes saved.')
    },
    onError: (err) => {
      // Map FastAPI field errors back onto the inputs
      if (err instanceof ApiError && err.status === 422 && Array.isArray(err.detail)) {
        for (const d of err.detail as Array<{ loc?: unknown[]; msg?: string }>) {
          const field = d.loc?.[d.loc.length - 1]
          if (typeof field === 'string' && SERVER_FIELDS.has(field)) {
            setError(field as keyof FormValues, { message: (d.msg ?? 'Invalid value').replace(/^Value error, /, '') })
          }
        }
      }
    },
  })

  const toggleActive = useMutation({
    mutationFn: (active: boolean) => adminApi.setMovieActive(id, active),
    onSuccess: (updated) => {
      // Only the status changed: leave any unsaved form edits alone
      qc.setQueryData(queryKeys.movie(id), (prev: Movie | undefined) => (prev ? { ...prev, is_active: updated.is_active } : updated))
      qc.invalidateQueries({ queryKey: ['movies', 'list'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success(`Movie is now ${updated.is_active ? 'active' : 'inactive'}.`)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const [confirmDelete, setConfirmDelete] = useState(false)
  const del = useMutation({
    mutationFn: () => adminApi.deleteMovie(id),
    onSuccess: () => {
      toast.success(`“${movie?.title}” was deleted.`)
      qc.removeQueries({ queryKey: queryKeys.movie(id) })
      qc.invalidateQueries({ queryKey: ['movies'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      navigate('/admin/movies', { replace: true })
    },
  })

  const onSubmit = (values: FormValues) => {
    // Send only what changed so concurrent scraper updates to other fields are not overwritten
    const body: MovieUpdate = {}
    for (const key of Object.keys(dirtyFields) as Array<keyof FormValues>) {
      ;(body as Record<string, unknown>)[key] = values[key]
    }
    save.mutate(body)
  }

  if (movieQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    )
  }
  if (movieQuery.isError || !movie) {
    const notFound = movieQuery.error instanceof ApiError && movieQuery.error.status === 404
    return notFound ? (
      <EmptyState title="Movie not found" description="It may have been deleted." action={<ButtonLink to="/admin/movies" variant="secondary" size="sm">Back to movies</ButtonLink>} />
    ) : (
      <ErrorState title="Could not load this movie" error={movieQuery.error} onRetry={() => movieQuery.refetch()} />
    )
  }

  const posterPreview = watch('poster_url')

  return (
    <>
      <Link to="/admin/movies" className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Movies
      </Link>
      <PageHeader
        title={movie.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge>{sourceLabel(movie.source)}</Badge>
            {movie.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="warn">Inactive</Badge>}
            <span className="font-mono text-xs">ID {movie.tmdb_id}</span>
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              loading={toggleActive.isPending}
              onClick={() => toggleActive.mutate(!movie.is_active)}
              icon={movie.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            >
              {movie.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <ButtonLink to={`/movie/${encodeURIComponent(movie.tmdb_id)}`} variant="outline" size="sm" target="_blank" icon={<ExternalLink className="h-4 w-4" />}>
              View on site
            </ButtonLink>
            <Button variant="outline" size="sm" className="text-red-300 hover:border-red-500/50 hover:bg-red-500/10" onClick={() => { del.reset(); setConfirmDelete(true) }} icon={<Trash2 className="h-4 w-4" />}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Panel title="Details">
            <div className="grid gap-5 sm:grid-cols-6">
              <Field label="Title" error={errors.title?.message} className="sm:col-span-6">
                {(p) => <Input {...p} {...register('title')} />}
              </Field>
              <Field label="Year" error={errors.year?.message} className="sm:col-span-2">
                {(p) => <Input {...p} {...register('year')} inputMode="numeric" placeholder="2024" />}
              </Field>
              <Field label="Rating" error={errors.rating?.message} hint="0–10" className="sm:col-span-2">
                {(p) => <Input {...p} {...register('rating')} inputMode="decimal" placeholder="7.5" />}
              </Field>
              <Field label="Runtime" error={errors.runtime?.message} className="sm:col-span-2">
                {(p) => <Input {...p} {...register('runtime')} placeholder="1h 45m" />}
              </Field>
              <Field label="Description" error={errors.description?.message} className="sm:col-span-6">
                {(p) => <Textarea {...p} {...register('description')} rows={5} />}
              </Field>
              <Field label="Genres" error={errors.genres?.message ?? errors.genres?.find?.((e) => e)?.message} hint="Press Enter or comma to add." className="sm:col-span-3">
                {(p) => (
                  <Controller
                    control={control}
                    name="genres"
                    render={({ field }) => <TagInput {...p} value={field.value ?? []} onChange={field.onChange} placeholder="Action, Drama…" suggestions={facets.data?.genres.map((g) => g.name)} />}
                  />
                )}
              </Field>
              <Field
                label="Catalog tags"
                error={errors.categories?.message ?? errors.categories?.find?.((e) => e)?.message}
                hint="Used for home-page rows, e.g. popular, top_rated."
                className="sm:col-span-3"
              >
                {(p) => (
                  <Controller
                    control={control}
                    name="categories"
                    render={({ field }) => (
                      <TagInput
                        {...p}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        normalize={(t) => t.trim().toLowerCase().replace(/\s+/g, '_')}
                        placeholder="popular"
                        suggestions={facets.data?.categories.map((c) => c.name)}
                      />
                    )}
                  />
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="Artwork">
            <div className="grid gap-5">
              <Field label="Poster URL" error={errors.poster_url?.message}>
                {(p) => <Input {...p} {...register('poster_url')} type="url" placeholder="https://…" />}
              </Field>
              <Field label="Backdrop URL" error={errors.backdrop_url?.message}>
                {(p) => <Input {...p} {...register('backdrop_url')} type="url" placeholder="https://…" />}
              </Field>
              <Field label="Logo URL" error={errors.logo_url?.message} hint="Transparent title artwork shown on the hero banner.">
                {(p) => <Input {...p} {...register('logo_url')} type="url" placeholder="https://…" />}
              </Field>
            </div>
          </Panel>

          {save.isError && !(save.error instanceof ApiError && save.error.status === 422) ? (
            <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {errorMessage(save.error)}
            </p>
          ) : null}

          <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-ink-700 bg-ink-950/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border">
            <span className="mr-auto text-sm text-fg-subtle">{isDirty ? 'Unsaved changes' : 'No changes'}</span>
            <Button variant="ghost" disabled={!isDirty || save.isPending} onClick={() => reset(toForm(movie))}>
              Discard
            </Button>
            <Button type="submit" disabled={!isDirty} loading={save.isPending} icon={<Save className="h-4 w-4" />}>
              Save changes
            </Button>
          </div>
        </form>

        <aside className="space-y-6">
          <Panel title="Poster preview">
            <Artwork src={posterPreview} alt="Poster preview" title={watch('title') || movie.title} className="mx-auto aspect-[2/3] w-44 rounded-card" />
          </Panel>
          <Panel title="Scraper-managed">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-fg-subtle">Stream</dt>
                <dd>{hasStream(movie) ? <Badge tone="ok">Available</Badge> : <Badge tone="warn">None</Badge>}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-subtle">Subtitle tracks</dt>
                <dd className="text-fg-muted">{movie.subtitles.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-subtle">Cast entries</dt>
                <dd className="text-fg-muted">{movie.cast.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-subtle">Added</dt>
                <dd className="text-fg-muted">{formatDate(movie.scraped_at, true)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-subtle">Updated</dt>
                <dd className="text-fg-muted">{formatDate(movie.updated_at, true)}</dd>
              </div>
              {movie.page_url ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-subtle">Source page</dt>
                  <dd>
                    <a href={movie.page_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-fg-muted hover:text-fg">
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-4 flex gap-2 rounded-lg bg-sky-500/10 p-3 text-xs leading-relaxed text-sky-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Streams, cast and subtitles are owned by the scrapers. Re-scraping this movie replaces its metadata with the source’s values.
            </p>
          </Panel>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete movie?"
        description={
          <>
            <strong className="text-fg">{movie.title}</strong> will be removed with its stored subtitles and queued subtitle jobs. This cannot be undone.
          </>
        }
        confirmLabel="Delete movie"
        loading={del.isPending}
        error={del.isError ? errorMessage(del.error) : null}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => del.mutate()}
      />
    </>
  )
}
