import React, {useState} from 'react';
import {Link, NavLink, useNavigate} from 'react-router-dom';
import {useAuth} from '../../auth';
import {api} from '../../api';
export default function Header() {
  const {user, setUser} = useAuth();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function logout() {
    try {await api('logout', {method: 'POST'}); setUser(null); navigate('/');}
    catch (e) {setError(e.message);}
  }
  return <><a className="skip" href="#main">Skip to content</a><header><Link className="brand" to="/">BEST CARS<span>DEALERSHIP REVIEWS</span></Link>
    <nav aria-label="Main navigation"><NavLink to="/">Dealerships</NavLink><a href="/about/">About Us</a><a href="/contact/">Contact Us</a></nav>
    <div className="account">{user ? <><span className="username">{user.userName}</span><button className="outline" onClick={logout}>Log out</button></> : <><Link to="/login">Log in</Link><Link className="button" to="/register">Create account</Link></>}</div>
  </header>{error && <p className="error" role="alert">{error}</p>}</>;
}
