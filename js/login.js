import { signIn, signUp } from './auth.js';

let signup = false;
const $ = id => document.getElementById(id);
const show = (text, ok) => {
  $('msg').className = 'alert ' + (ok ? 'alert-ok' : 'alert-error');
  $('msg').textContent = text;
};

$('toggle').onclick = () => {
  signup = !signup;
  $('name-field').hidden = !signup;
  $('title').textContent = $('submit').textContent = signup ? 'Create account' : 'Sign in';
  $('toggle').textContent = signup ? 'I have an account' : 'Create account';
};

$('form').onsubmit = async e => {
  e.preventDefault();
  const email = $('email').value.trim();
  const pw = $('password').value;
  if (!email || pw.length < 8) return show('Enter a valid email and a password of at least 8 characters.');
  $('submit').disabled = true;
  const { error } = signup ? await signUp(email, pw, $('name').value.trim()) : await signIn(email, pw);
  $('submit').disabled = false;
  if (error) return show(error.message);
  if (signup) return show('Account created. Check your email if confirmation is required, then sign in.', true);
  const next = new URLSearchParams(location.search).get('next');
  location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
};
