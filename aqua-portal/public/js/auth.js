document.getElementById('show-register').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('form-login').style.display='none';
  document.getElementById('form-register').style.display='block';
});
document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('form-login').style.display='block';
  document.getElementById('form-register').style.display='none';
});

document.getElementById('btn-register').addEventListener('click', async () => {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const fullname = document.getElementById('reg-fullname').value;
  const msg = document.getElementById('reg-msg');
  msg.textContent = '';
  if (!username || !password) { msg.textContent = 'Enter username & password'; return; }
  const res = await fetch('/api/register', {
    method: 'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ username, password, fullname })
  });
  const j = await res.json();
  if (res.ok) { location.href = '/dashboard'; } else { msg.textContent = j.error || 'Registration failed'; }
});

document.getElementById('btn-login').addEventListener('click', async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const msg = document.getElementById('login-msg');
  msg.textContent = '';
  if (!username || !password) { msg.textContent = 'Enter username & password'; return; }
  const res = await fetch('/api/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  const j = await res.json();
  if (res.ok) { location.href = '/dashboard'; } else { msg.textContent = j.error || 'Login failed'; }
});
