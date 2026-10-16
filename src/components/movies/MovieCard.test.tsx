import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { MovieCard } from './MovieCard'
import { Artwork } from './Artwork'
import { makeMovie, renderWithRouter } from '@/test/utils'

describe('MovieCard', () => {
  it('shows title, year, rating and first genre, linking to the detail page', () => {
    renderWithRouter(<MovieCard movie={makeMovie({ tmdb_id: 'a/b', title: 'Heat', year: '1995', rating: '8.3', genres: ['Crime', 'Drama'] })} />)
    expect(screen.getByRole('heading', { name: 'Heat' })).toBeInTheDocument()
    expect(screen.getByText('1995')).toBeInTheDocument()
    expect(screen.getByLabelText('Rated 8.3 out of 10')).toBeInTheDocument()
    expect(screen.getByText('Crime')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/movie/a%2Fb')
  })

  it('hides missing data instead of inventing it', () => {
    renderWithRouter(<MovieCard movie={makeMovie({ year: '', rating: '0.0', genres: [], m3u8_url: '' })} />)
    expect(screen.queryByLabelText(/Rated/)).not.toBeInTheDocument()
    expect(screen.getByText('No stream')).toBeInTheDocument()
  })
})

describe('Artwork', () => {
  it('falls back to a placeholder when the image fails or is missing', () => {
    const { unmount } = renderWithRouter(<Artwork src="https://img.example/broken.jpg" alt="Broken poster" title="Broken Arrow" />)
    fireEvent.error(screen.getByAltText('Broken poster'))
    expect(screen.getByRole('img', { name: 'Broken poster' }).tagName).toBe('DIV')
    expect(screen.getByText('BA')).toBeInTheDocument()
    unmount()
    renderWithRouter(<Artwork src="" alt="No poster" title="Up" />)
    expect(screen.getByRole('img', { name: 'No poster' }).tagName).toBe('DIV')
  })
})
