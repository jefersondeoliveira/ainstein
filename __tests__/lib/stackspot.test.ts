// __tests__/lib/stackspot.test.ts

describe('stackspot token cache', () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    // Reset module registry so module-level cache vars are fresh
    jest.resetModules()
    // Mock global fetch
    mockFetch = jest.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('fetches token on first call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok1', expires_in: 3600 }),
    })
    const { getStackspotToken } = await import('@/lib/stackspot')
    const token = await getStackspotToken()
    expect(token).toBe('tok1')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('reuses cached token on second call', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'tok1', expires_in: 3600 }),
    })
    const { getStackspotToken } = await import('@/lib/stackspot')
    await getStackspotToken()
    await getStackspotToken()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
