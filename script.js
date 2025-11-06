
// frontend script for SmartCityApp communicating with Express APIs

async function api(path, method='GET', data) {
  const opts = { method, headers: {'Content-Type':'application/json'} };
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch(path, opts);
  return res.json();
}

// helper to save current user in sessionStorage
function setCurrent(user) { sessionStorage.setItem('sc_user', JSON.stringify(user)); }
function getCurrent() { return JSON.parse(sessionStorage.getItem('sc_user') || 'null'); }
function clearCurrent(){ sessionStorage.removeItem('sc_user'); }

// LOGIN page
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
    const res = await api('/api/login','POST',{email,password,role});
    const msg = document.getElementById('loginMsg');
    if (res.user) {
      setCurrent(res.user);
      msg.style.color='green'; msg.textContent='Login successful. Redirecting...';
      setTimeout(()=> {
        if (res.user.role === 'admin') window.location = 'admin-dashboard.html'; else window.location = 'user-dashboard.html';
      },600);
    } else {
      msg.style.color='crimson'; msg.textContent = res.error || 'Login failed';
    }
  });
}

// REGISTER page
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const res = await api('/api/register','POST',{name,email,password,role});
    const msg = document.getElementById('regMsg');
    if (res.user) {
      setCurrent(res.user);
      msg.style.color='green'; msg.textContent='Registered. Redirecting...';
      setTimeout(()=> {
        if (res.user.role === 'admin') window.location = 'admin-dashboard.html'; else window.location = 'user-dashboard.html';
      },600);
    } else {
      msg.style.color='crimson'; msg.textContent = res.error || 'Register failed';
    }
  });
}

// USER dashboard
if (document.getElementById('userReports') !== null) {
  const user = getCurrent();
  if (!user || user.role !== 'user') { window.location='login.html'; }
  document.getElementById('welcomeUser').textContent = 'Hello, ' + user.name;
  document.getElementById('logoutLink').addEventListener('click', e=>{ e.preventDefault(); clearCurrent(); window.location='index.html'; });

  async function loadServices() {
    const res = await api('/api/services');
    const sel = document.getElementById('reportService');
    sel.innerHTML = '<option value="">None</option>' + res.services.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  }
  async function loadReports() {
    const res = await api('/api/reports');
    const rows = res.reports.filter(r=> r.userId === user.id).map((r,idx)=>`<tr><td>${idx+1}</td><td>${r.serviceName}</td><td>${r.text}</td><td>${r.status}</td><td>${new Date(r.date).toLocaleString()}</td></tr>`).join('');
    document.getElementById('userReports').innerHTML = rows || '<tr><td colspan="5">No reports</td></tr>';
  }

  document.getElementById('openReport').addEventListener('click', ()=>{ document.getElementById('reportBox').style.display='block'; });
  document.getElementById('cancelReport').addEventListener('click', ()=>{ document.getElementById('reportBox').style.display='none'; });

  document.getElementById('submitReport').addEventListener('click', async ()=> {
    const sid = document.getElementById('reportService').value;
    const desc = document.getElementById('reportDesc').value;
    if (!desc) { document.getElementById('reportMsg').textContent='Please enter description'; return; }
    const services = await api('/api/services');
    const svc = services.services.find(s=>s.id===sid);
    await api('/api/reports','POST',{ userId:user.id, userName:user.name, serviceId: sid, serviceName: svc ? svc.name : 'None', text: desc });
    document.getElementById('reportMsg').textContent = 'Submitted';
    document.getElementById('reportDesc').value = '';
    document.getElementById('reportBox').style.display='none';
    loadReports();
  });

  loadServices();
  loadReports();
}

// ADMIN dashboard
if (document.getElementById('complaintsTable') !== null) {
  const user = getCurrent();
  if (!user || user.role !== 'admin') { window.location='login.html'; }
  document.getElementById('welcomeAdmin').textContent = 'Hello, ' + user.name;
  document.getElementById('logoutAdmin').addEventListener('click', e=>{ e.preventDefault(); clearCurrent(); window.location='index.html'; });

  document.getElementById('addService').addEventListener('click', async ()=> {
    const name = prompt('Service name');
    if (!name) return;
    const cat = prompt('Category') || '';
    const loc = prompt('Location') || '';
    await api('/api/services','POST',{ name, category:cat, location:loc });
    document.getElementById('serviceMsg').textContent = 'Service added';
    loadServices(); loadComplaints();
    setTimeout(()=> document.getElementById('serviceMsg').textContent = '',1200);
  });

  async function loadServices(){
    const res = await api('/api/services');
    document.getElementById('servicesTable').innerHTML = res.services.map((s,idx)=>`<tr><td>${idx+1}</td><td>${s.name}</td><td>${s.category}</td><td>${s.location}</td></tr>`).join('') || '<tr><td colspan="4">No services</td></tr>';
  }
  async function loadComplaints(){
    const res = await api('/api/reports');
    document.getElementById('complaintsTable').innerHTML = res.reports.map((r,idx)=>`<tr>
      <td>${idx+1}</td><td>${r.userName}</td><td>${r.serviceName}</td><td>${r.text}</td><td>${r.status}</td>
      <td><select data-id="${r.id}" class="status-select"><option${r.status==='Pending'?' selected':''}>Pending</option><option${r.status==='In Progress'?' selected':''}>In Progress</option><option${r.status==='Resolved'?' selected':''}>Resolved</option></select></td>
    </tr>`).join('') || '<tr><td colspan="6">No complaints</td></tr>';
    setTimeout(()=> {
      document.querySelectorAll('.status-select').forEach(sel=>{
        sel.addEventListener('change', async ()=> {
          const id = sel.getAttribute('data-id');
          await api('/api/reports/'+id,'PUT',{ status: sel.value });
          loadComplaints();
        });
      });
    },50);
  }

  loadServices(); loadComplaints();
}
