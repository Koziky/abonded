// ---------- State ----------
const state = {
    queue: [],          // {id, url, title, thumbnail}
    playlists: {},      // name → array of songs
    currentPlaylist: null
};

// ---------- DOM ----------
const ytUrlInput = document.getElementById('ytUrl');
const addBtn = document.getElementById('addBtn');
const queueList = document.getElementById('queueList');
const playlistContainer = document.getElementById('playlistContainer');
const newPlaylistBtn = document.getElementById('newPlaylistBtn');

// ---------- Helpers ----------
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function renderQueue() {
    queueList.innerHTML = '';
    state.queue.forEach((song, idx) => {
        const li = document.createElement('li');
        li.className = 'song-item';
        li.innerHTML = `
            <img src="${song.thumbnail}" alt="">
            <span>${song.title}</span>
            <button data-idx="${idx}" class="remove">×</button>
        `;
        queueList.appendChild(li);
    });
}

function renderPlaylists() {
    playlistContainer.innerHTML = '';
    for (const [name, songs] of Object.entries(state.playlists)) {
        const div = document.createElement('div');
        div.className = 'playlist';
        div.innerHTML = `<h3>${name} <small>(${songs.length})</small></h3><ul></ul>`;
        const ul = div.querySelector('ul');
        songs.forEach(s => {
            const li = document.createElement('li');
            li.innerHTML = `<img src="${s.thumbnail}" alt=""> ${s.title}`;
            ul.appendChild(li);
        });
        playlistContainer.appendChild(div);
    }
}

// ---------- YouTube Data ----------
async function fetchYouTubeInfo(videoId) {
    // Using oEmbed (no API key needed)
    const oembed = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    try {
        const res = await fetch(oembed);
        const data = await res.json();
        return {
            title: data.title,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        };
    } catch (e) {
        console.error(e);
        return { title: 'Unknown Title', thumbnail: '' };
    }
}

// ---------- Add Song ----------
addBtn.addEventListener('click', async () => {
    const url = ytUrlInput.value.trim();
    if (!url) return alert('Paste a YouTube link');

    const videoId = extractVideoId(url);
    if (!videoId) return alert('Invalid YouTube URL');

    const { title, thumbnail } = await fetchYouTubeInfo(videoId);

    const song = { id: videoId, url, title, thumbnail };
    state.queue.push(song);
    ytUrlInput.value = '';

    renderQueue();

    // Auto-add to current playlist if one is selected
    if (state.currentPlaylist) {
        state.playlists[state.currentPlaylist].push(song);
        renderPlaylists();
    }
});

// Remove from queue
queueList.addEventListener('click', e => {
    if (e.target.classList.contains('remove')) {
        const idx = e.target.dataset.idx;
        state.queue.splice(idx, 1);
        renderQueue();
    }
});

// ---------- Playlists ----------
newPlaylistBtn.addEventListener('click', () => {
    const name = prompt('Playlist name:');
    if (!name) return;
    if (state.playlists[name]) return alert('Name already taken');
    state.playlists[name] = [];
    state.currentPlaylist = name;   // make it active
    renderPlaylists();
});

// Switch active playlist (optional UI)
playlistContainer.addEventListener('click', e => {
    const h3 = e.target.closest('h3');
    if (!h3) return;
    const name = h3.textContent.split(' ')[0];
    state.currentPlaylist = name;
    alert(`Active playlist: ${name}`);
});

// Initial render
renderQueue();
renderPlaylists();
