import React, {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {api} from '../../api';
import {useAuth} from '../../auth';
export default function Dealers() {
  const [all, setAll] = useState([]); const [error, setError] = useState('');
  const [busy, setBusy] = useState(true); const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const {user} = useAuth(); const [params, setParams] = useSearchParams(); const state = params.get('state') || 'All';
  useEffect(() => {api('get_dealers').then(data => setAll(data.dealers)).catch(e => setError(e.message)).finally(() => setBusy(false));}, []);
  const states = [...new Set(all.map(x => x.state))].sort();
  const rows = all.filter(x => (state === 'All' || x.state === state) && (x.full_name+' '+x.city).toLowerCase().includes(search.toLowerCase()));
  const count = Math.max(1, Math.ceil(rows.length / 20));
  const shown = rows.slice((page-1)*20, page*20);
  function choose(value) {setPage(1); setParams(value === 'All' ? {} : {state:value});}
  return <div className="page"><section className="hero"><div><p className="eyebrow">LOCAL KNOWLEDGE. BETTER DECISIONS.</p><h1>A better car starts<br/>with a trusted dealer.</h1><p>Explore our branches across the United States.<br/>Read customer experiences, then add your own.</p></div><img src="/static/car_dealership.jpg" alt="Cars at a Best Cars dealership"/></section>
    <section aria-labelledby="dealers-heading" className="directory"><div className="section-title"><div><p className="eyebrow">FIND YOUR BRANCH</p><h2 id="dealers-heading">Our dealerships <span>{all.length}</span></h2></div>{user && <p>Welcome, <strong>{user.userName}</strong>. Choose a dealer to write a review.</p>}</div>
      <div className="filters"><label>State<select aria-label="State" value={state} onChange={e => choose(e.target.value)}><option value="All">All states</option>{states.map(x => <option key={x}>{x}</option>)}</select></label><label>Search dealerships<input type="search" placeholder="Dealer name or city" value={search} onChange={e => {setSearch(e.target.value); setPage(1);}}/></label><p aria-live="polite">{rows.length} branches</p></div>
      {error && <p className="error" role="alert">{error} <button onClick={() => window.location.reload()}>Retry</button></p>}
      {busy ? <p role="status">Loading dealerships…</p> : <><div className="table-scroll"><table><thead><tr><th scope="col">ID</th><th scope="col">Dealership</th><th scope="col">City</th><th scope="col">Address</th><th scope="col">ZIP</th><th scope="col">State</th>{user && <th scope="col">Review Dealer</th>}</tr></thead><tbody>{shown.map(x => <tr key={x.id}><td>{x.id}</td><td><Link to={'/dealer/'+x.id}>{x.full_name}</Link></td><td>{x.city}</td><td>{x.address}</td><td>{x.zip}</td><td><span className="state-tag">{x.state}</span></td>{user && <td><Link className="review-link" to={'/postreview/'+x.id}>Write a review ↗</Link></td>}</tr>)}</tbody></table></div>{rows.length === 0 && <p className="empty">No branches match your search. Try another state or city.</p>}<div className="pagination"><span>Page {Math.min(page,count)} of {count}</span><button className="outline" disabled={page <= 1} onClick={() => setPage(page-1)}>Previous</button><button className="outline" disabled={page >= count} onClick={() => setPage(page+1)}>Next</button></div></>}
    </section></div>;
}
