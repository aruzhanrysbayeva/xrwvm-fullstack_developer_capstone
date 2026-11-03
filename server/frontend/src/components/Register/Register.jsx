import React, {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {api} from '../../api';
import {useAuth} from '../../auth';
export default function Register() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const {setUser} = useAuth(); const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {const user = await api('register', {method:'POST', body:JSON.stringify(values)}); setUser(user); navigate('/');}
    catch (e) {setError(e.message);} finally {setBusy(false);}
  }
  return <section className="auth-card"><p className="eyebrow">JOIN THE CONVERSATION</p><h1>Create your account</h1><p>Save your details and share your dealership experience.</p>
    <form onSubmit={submit}>{error && <p className="error" role="alert">{error}</p>}
      <label>Username<input name="userName" autoComplete="username" maxLength="150" required/></label>
      <div className="two-col"><label>First Name<input name="firstName" autoComplete="given-name" maxLength="150" required/></label><label>Last Name<input name="lastName" autoComplete="family-name" maxLength="150" required/></label></div>
      <label>Email<input name="email" type="email" autoComplete="email" maxLength="254" required/></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength="8" required aria-describedby="password-help"/></label>
      <small id="password-help">Use at least 8 characters. Avoid common passwords and personal details.</small>
      <button disabled={busy} type="submit">{busy ? 'Creating account…' : 'Register'}</button>
    </form><p>Already have an account? <Link to="/login">Log in</Link></p>
  </section>;
}
