export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/') && !event.path.startsWith('/uploads/')) return
  const { apiBase } = useRuntimeConfig(event)
  return proxyRequest(event, apiBase + event.path, {
    headers: { 'x-forwarded-for': getRequestIP(event) ?? '' },
  })
})