import React, {useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {useAuth} from '../../auth';
import {api} from '../../api';
export default function Login() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const {setUser} = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {const user = await api('login', {method:'POST', body:JSON.stringify(data)}); setUser(user); const next = params.get('next'); navigate(next && /^\/postreview\/\d+$/.test(next) ? next : '/');}
    catch (e) {setError(e.message);} finally {setBusy(false);}
  }
  return <section className="auth-card"><p className="eyebrow">WELCOME BACK</p><h1>Log in to Best Cars</h1><p>Your next review helps someone make a better choice.</p><form onSubmit={submit}>
    {error && <p className="error" role="alert">{error}</p>}
    <label>Username<input name="userName" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
    <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button></form><p>New here? <Link to="/register">Create an account</Link></p></section>;
}
