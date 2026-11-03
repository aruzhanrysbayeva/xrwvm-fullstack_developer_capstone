export async function api(path, options = {}) {
  const token = document.cookie.split('; ').find(x => x.startsWith('csrftoken='))?.split('=')[1];
  const response = await fetch('/djangoapp/' + path, {
    ...options, credentials: 'same-origin',
    headers: {'Content-Type': 'application/json', ...(token ? {'X-CSRFToken': decodeURIComponent(token)} : {}), ...options.headers},
  });
  const data = await response.json().catch(() => ({error: 'The request could not be completed. Refresh the page and try again.'}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
