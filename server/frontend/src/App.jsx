import React from 'react';
import {Routes, Route} from 'react-router-dom';
import {AuthProvider} from './auth';
import Header from './components/Header/Header';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import Dealers from './components/Dealers/Dealers';
import Dealer from './components/Dealers/Dealer';
import PostReview from './components/Dealers/PostReview';
export default function App() {
  return <AuthProvider><Header/><main id="main"><Routes>
    <Route path="/" element={<Dealers/>}/><Route path="/dealers" element={<Dealers/>}/>
    <Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/>
    <Route path="/dealer/:id" element={<Dealer/>}/><Route path="/postreview/:id" element={<PostReview/>}/>
    <Route path="*" element={<div className="empty"><h1>Page not found</h1><a href="/">Return to dealerships</a></div>}/>
  </Routes></main><footer>BEST CARS <span>Find your branch. Share your experience.</span><small>Educational dealership portal · Fictional staff and contact details</small></footer></AuthProvider>;
}
