// Lucid Tune Hub - Vanilla conversion (simplified)
// This is a practical, best-effort conversion of the React+Vite project into a single-page app with HTML/CSS/JS.
// NOTE: Supabase operations require you to set SUPABASE_URL and SUPABASE_ANON_KEY variables below.

const SUPABASE_URL = ''; // <-- set your supabase url
const SUPABASE_ANON_KEY = ''; // <-- set your anon/public key

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('Supabase not configured. Auth and remote DB will be disabled.');
}

// Simple client-side router
function routePath() {
  return location.pathname;
}

function navigate(path) {
  history.pushState({}, '', path);
  render();
}

window.addEventListener('popstate', () => render());

// Simple in-memory store for session and data
const store = {
  session: null,
  playlists: [], // {id,title,description,songs: [{id,title,url}]}
  nowPlaying: null,
  queue: [],
};

// Utilities
function el(html) {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstElementChild;
}

// Mock loader: attempts to load playlists from /public/playlists.json if present; else uses sample data
async function loadPlaylists() {
  try {
    // try fetch from same origin
    const res = await fetch('/playlists.json');
    if (res.ok) {
      const data = await res.json();
      store.playlists = data.playlists || [];
      return;
    }
  } catch(e){}
  // fallback sample data
  store.playlists = [
    {id:'1', title:'Demo Beats', description:'Chill demo playlist', songs:[
      {id:'s1', title:'Ambient Loop', url:'https://cdn.pixabay.com/download/audio/2022/03/15/audio_6b2a1b8a7a.mp3?filename=relaxing-ambience-111881.mp3'},
      {id:'s2', title:'Calm Piano', url:'https://cdn.pixabay.com/download/audio/2021/10/07/audio_4a1b7b0c13.mp3?filename=peaceful-meditation-112607.mp3'}
    ]},
    {id:'2', title:'Lo-Fi Mix', description:'Lo-fi study mix', songs:[
      {id:'s3', title:'Lo-fi 1', url:'https://cdn.pixabay.com/download/audio/2021/09/07/audio_1c4f3bd8a0.mp3?filename=lofi-beat-111133.mp3'}
    ]}
  ];
}

// App rendering functions
function renderLayout() {
  const tpl = document.getElementById('tpl-layout');
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(tpl.content.cloneNode(true));

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="logo">Lucid Tune Hub</div>
    <div class="card">
      <input id="searchInput" class="input" placeholder="Search playlists..." />
    </div>
    <nav class="nav card" id="navList"></nav>
    <div class="card playlist-list" id="playlistList"></div>
    <div class="footer-note card">Converted to vanilla JS. Supabase: ${supabase ? 'enabled' : 'disabled'}</div>
  `;
  document.getElementById('searchInput').addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase();
    renderPlaylists(q);
  });
}

function renderPlaylists(filter='') {
  const elList = document.getElementById('playlistList');
  if (!store.playlists.length) { elList.innerHTML = '<div class="loading">No playlists found</div>'; return; }
  const items = store.playlists.filter(p => p.title.toLowerCase().includes(filter) || p.description.toLowerCase().includes(filter));
  elList.innerHTML = items.map(p=>`
    <div class="playlist-item" data-id="${p.id}">
      <strong>${escapeHtml(p.title)}</strong>
      <div style="font-size:13px;color:var(--muted)">${escapeHtml(p.description||'')}</div>
    </div>
  `).join('');
  elList.querySelectorAll('.playlist-item').forEach(node=>{
    node.addEventListener('click', ()=> navigate('/playlist/'+node.dataset.id));
  });
}

function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderHeader(title='Home') {
  const main = document.getElementById('main');
  const header = document.createElement('div');
  header.className = 'header';
  header.innerHTML = `<h2>${escapeHtml(title)}</h2>
    <div>
      ${store.session ? `<button class="btn" id="btnSignOut">Sign out</button>` : `<button class="btn" id="btnSignIn">Sign in</button>`}
    </div>`;
  main.appendChild(header);
  if (store.session) {
    document.getElementById('btnSignOut').addEventListener('click', async ()=>{
      if (!supabase) return alert('Supabase not configured');
      await supabase.auth.signOut();
      store.session = null;
      render();
    });
  } else {
    document.getElementById('btnSignIn').addEventListener('click', async ()=>{
      if (!supabase) return alert('Supabase not configured');
      // redirect to provider (GitHub)
      await supabase.auth.signInWithOAuth({provider:'github'});
    });
  }
}

function renderHome() {
  const main = document.getElementById('main');
  main.innerHTML = '';
  renderHeader('Home');
  const content = document.createElement('div');
  content.innerHTML = `<div class="card"><strong>Welcome to Lucid Tune Hub</strong><p style="color:var(--muted)">This is a simplified conversion of your React app. Click a playlist to view details.</p></div>`;
  main.appendChild(content);

  const grid = document.createElement('div');
  grid.className = 'grid';
  store.playlists.forEach(p=>{
    const node = document.createElement('div');
    node.className = 'card';
    node.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:700">${escapeHtml(p.title)}</div>
        <div style="color:var(--muted);font-size:13px">${escapeHtml(p.description||'')}</div>
      </div>
      <div><button class="btn" data-id="${p.id}">Open</button></div>
    </div>`;
    grid.appendChild(node);
    node.querySelector('button').addEventListener('click', ()=> navigate('/playlist/'+p.id));
  });
  main.appendChild(grid);
}

function renderPlaylistDetail(id) {
  const p = store.playlists.find(x=>x.id==id);
  const main = document.getElementById('main');
  if (!p) {
    main.innerHTML = '<div class="loading">Playlist not found</div>';
    return;
  }
  main.innerHTML = '';
  renderHeader(p.title);
  const container = document.createElement('div');
  container.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center">
    <div>
      <h3>${escapeHtml(p.title)}</h3>
      <div style="color:var(--muted)">${escapeHtml(p.description||'')}</div>
    </div>
    <div>
      <button class="btn" id="btn-play-all">Play All</button>
    </div>
  </div></div>`;
  main.appendChild(container);

  const list = document.createElement('div');
  list.className = 'card';
  list.innerHTML = p.songs.map(s=>`<div class="playlist-item" data-sid="${s.id}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div>${escapeHtml(s.title)}</div>
        <div style="font-size:12px;color:var(--muted)">${escapeHtml(s.id)}</div>
      </div>
      <div>
        <button class="btn btn-play" data-url="${encodeURIComponent(s.url)}">Play</button>
      </div>
    </div>
  </div>`).join('');
  main.appendChild(list);

  list.querySelectorAll('.btn-play').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const url = decodeURIComponent(btn.dataset.url);
      playNow(url);
    });
  });

  document.getElementById('btn-play-all').addEventListener('click', ()=>{
    store.queue = p.songs.map(s=>s.url);
    playNextInQueue();
  });
}

let audio = null;
function initPlayerControls() {
  let controls = document.querySelector('.controls');
  if (controls) return;
  controls = el(`<div class="controls card">
    <div id="playerInfo" style="flex:1">
      <div id="playerTitle">Not playing</div>
      <div style="font-size:12px;color:var(--muted)" id="playerMeta"></div>
    </div>
    <div>
      <button class="btn" id="btnPrev">Prev</button>
      <button class="btn" id="btnPlay">Play</button>
      <button class="btn" id="btnNext">Next</button>
    </div>
  </div>`);
  document.body.appendChild(controls);

  document.getElementById('btnPlay').addEventListener('click', ()=>{
    if (!audio) return;
    if (audio.paused) audio.play(); else audio.pause();
    updatePlayButton();
  });
  document.getElementById('btnNext').addEventListener('click', ()=> playNextInQueue());
  document.getElementById('btnPrev').addEventListener('click', ()=> { /* not implemented */ });
}

function updatePlayButton(){
  const btn = document.getElementById('btnPlay');
  if (!audio) return;
  btn.textContent = audio.paused ? 'Play' : 'Pause';
}

function playNow(url) {
  if (!audio) {
    audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.addEventListener('ended', ()=> playNextInQueue());
    audio.addEventListener('play', updatePlayButton);
    audio.addEventListener('pause', updatePlayButton);
  }
  audio.src = url;
  audio.play();
  document.getElementById('playerTitle').textContent = 'Now playing';
  document.getElementById('playerMeta').textContent = url;
  initPlayerControls();
}

function playNextInQueue() {
  if (!store.queue || store.queue.length===0) {
    // clear
    if (audio) { audio.pause(); audio.src=''; }
    return;
  }
  const next = store.queue.shift();
  playNow(next);
}

// Session handling with Supabase (if configured)
async function initSession() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  store.session = data.session;
  // on change
  supabase.auth.onAuthStateChange((_event, sess) => {
    store.session = sess;
    render();
  });
}

// Main render
async function render() {
  renderLayout();
  const path = routePath();
  if (!store.playlists.length) await loadPlaylists();
  if (path === '/' || path==='/index.html') {
    renderPlaylists();
    renderHome();
  } else if (path.startsWith('/playlist/')) {
    const id = path.split('/')[2];
    renderPlaylists();
    renderPlaylistDetail(id);
  } else {
    renderPlaylists();
    renderHome();
  }
  initPlayerControls();
}

// Start app
(async function(){
  await initSession();
  await loadPlaylists();
  render();
})();
"""

# Write files
with open(os.path.join(outdir,'index.html'),'w',encoding='utf-8') as fh:
    fh.write(index_html)
with open(os.path.join(outdir,'style.css'),'w',encoding='utf-8') as fh:
    fh.write(style_css)
with open(os.path.join(outdir,'script.js'),'w',encoding='utf-8') as fh:
    fh.write(script_js)

print("Wrote files to", outdir)
print("Files:", os.listdir(outdir))
print("\nYou can download them from the paths above.")
