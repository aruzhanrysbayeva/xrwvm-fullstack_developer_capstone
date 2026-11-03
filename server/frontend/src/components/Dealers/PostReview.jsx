import React, {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {api} from '../../api';
import {useAuth} from '../../auth';
export default function PostReview() {
  const {id} = useParams(); const {user, loading} = useAuth(); const navigate = useNavigate();
  const [dealer, setDealer] = useState(null); const [cars, setCars] = useState([]); const [make, setMake] = useState(''); const [model, setModel] = useState(''); const [year, setYear] = useState('');
  const [purchase, setPurchase] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {Promise.all([api('dealer/'+id), api('get_cars')]).then(([d,c]) => {setDealer(d.dealer[0]); setCars(c.CarModels);}).catch(e => setError(e.message));}, [id]);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {await api('add_review', {method:'POST', body:JSON.stringify({...values, dealership:Number(id), purchase, car_make:make, car_model:model, car_year:Number(year)})}); navigate('/dealer/'+id, {state:{posted:true}});}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  if(loading) return <p className="page" role="status">Checking your account…</p>;
  if(!user) return <section className="auth-card"><h1>Log in to write a review</h1><p>You need an account to share your dealership experience.</p><Link className="button" to={'/login?next='+encodeURIComponent('/postreview/'+id)}>Log in</Link></section>;
  const makes = [...new Set(cars.map(c => c.CarMake))].sort(); const models = [...new Set(cars.filter(c => c.CarMake === make).map(c => c.CarModel))].sort(); const years = [...new Set(cars.filter(c => c.CarMake === make && c.CarModel === model).map(c => c.year))].sort((a,b) => b-a);
  return <section className="form-page"><Link className="back-link" to={'/dealer/'+id}>← Back to dealership</Link><p className="eyebrow">SHARE YOUR EXPERIENCE</p><h1>Review {dealer?.full_name || 'this dealership'}</h1><p>Posting as <strong>{user.userName}</strong>. Tell others what they can expect.</p>
    <form className="card" onSubmit={submit}>{error && <p className="error" role="alert">{error}</p>}<label>Your review<textarea name="review" rows="5" minLength="5" maxLength="3000" placeholder="What went well? What could have been better?" required/></label><label className="check"><input type="checkbox" checked={purchase} onChange={e => setPurchase(e.target.checked)}/>I purchased a vehicle from this dealership</label>
    {purchase && <fieldset><legend>Vehicle purchase</legend><div className="two-col"><label>Purchase date<input name="purchase_date" type="date" required max={new Date().toLocaleDateString('en-CA')}/></label><label>Car make<select value={make} required onChange={e => {setMake(e.target.value); setModel(''); setYear('');}}><option value="">Choose make</option>{makes.map(x => <option key={x}>{x}</option>)}</select></label><label>Car model<select value={model} required disabled={!make} onChange={e => {setModel(e.target.value); setYear('');}}><option value="">Choose model</option>{models.map(x => <option key={x}>{x}</option>)}</select></label><label>Car year<select value={year} required disabled={!model} onChange={e => setYear(e.target.value)}><option value="">Choose year</option>{years.map(x => <option key={x}>{x}</option>)}</select></label></div></fieldset>}
    <p className="muted">Keep your review helpful and respectful. Avoid sharing private contact or financial information.</p><button type="submit" disabled={busy || !dealer}>{busy ? 'Publishing…' : 'Post Review'}</button></form></section>;
}
