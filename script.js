// Spotify API Config - Replace with your own
const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
const REDIRECT_URI = 'http://localhost:8080'; // Your local server URL
const SCOPES = 'playlist-modify-public user-read-private';

// Global vars
let accessToken = localStorage.getItem('spotify_token');
let player; // YouTube player
let currentQueue = JSON.parse(localStorage.getItem('music_queue')) || [];
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
let currentPlaylist = null;
let currentTrackIndex = 0;
let selectedTrack = null; // For adding to playlist

// PKCE for OAuth
let codeVerifier = generateCodeVerifier();
let codeChallenge = generateCodeChallenge(codeVerifier);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadPlaylists();
    loadQueue();
    showPage('home');
    loadRecommended();
    onYouTubeIframeAPIReady();
});

// Navigation
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-menu a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        showPage(link.dataset.page);
    });
});

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Auth
function checkAuth() {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const code = urlParams.get('code');
    if (code && !accessToken) {
        exchangeCodeForToken(code);
    }
}

async function loginSpotify() {
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const authUrl = `https://accounts.spotify.com/authorize?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `scope=${encodeURIComponent(SCOPES)}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256`;
    window.location.href = authUrl;
}

async function exchangeCodeForToken(code) {
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier
    });

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });
        const data = await response.json();
        accessToken = data.access_token;
        localStorage.setItem('spotify_token', accessToken);
        window.location.hash = ''; // Clear hash
        loadUserId(); // For playlists
    } catch (error) {
        console.error('Auth error:', error);
    }
}

function generateCodeVerifier() {
    let verifier = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (let i = 0; i < 128; i++) {
        verifier += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return verifier;
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Spotify Functions
let userId = null;

async function loadUserId() {
    if (!accessToken) return;
    const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();
    userId = data.id;
}

async function searchSpotify(query = '') {
    if (!accessToken) {
        alert('Please log in to Spotify');
        loginSpotify();
        return;
    }
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();
    displayTracks(data.tracks.items, 'search-results');
}

function displayTracks(tracks, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    tracks.forEach(track => {
        const div = document.createElement('div');
        div.className = 'track';
        div.innerHTML = `
            <img src="${track.album.images[0]?.url || ''}" alt="${track.name}">
            <div class="track-info">
                <h4>${track.name}</h4>
                <p>${track.artists[0].name}</p>
            </div>
            <div style="margin-left: auto;">
                <button onclick="addToQueue('${track.uri}', '${track.name}', '${track.artists[0].name}', '${track.album.images[0]?.url}')">Add to Queue</button>
                <button onclick="openInSpotify('${track.external_urls.spotify}')">Play on Spotify</button>
                <button onclick="selectForPlaylist('${track.uri}', '${track.name}')">Add to Playlist</button>
            </div>
        `;
        container.appendChild(div);
    });
}

async function loadRecommended() {
    if (!accessToken) return;
    // Simple recent tracks for demo
    const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=5', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();
    displayTracks(data.items.map(item => item.track), 'recommended-tracks');
}

function openInSpotify(url) {
    window.open(url, '_blank');
}

// YouTube Functions
function onYouTubeIframeAPIReady() {
    // Player will be created when a YT song is added to queue
}

function addYouTubeSong() {
    const url = document.getElementById('yt-url').value;
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
        alert('Invalid YouTube URL');
        return;
    }
    // Fetch video title for display (using simple fetch, no API key)
    fetch(`https://noembed.com/embed?dataType=json&url=${url}`)
        .then(res => res.json())
        .then(data => {
            const track = {
                id: videoId,
                name: data.title,
                artist: 'YouTube',
                image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                type: 'youtube',
                uri: url
            };
            addToQueue(track.uri, track.name, track.artist, track.image, track);
        })
        .catch(() => {
            // Fallback
            const track = {
                id: videoId,
                name: 'YouTube Track',
                artist: 'Custom',
                image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                type: 'youtube',
                uri: url
            };
            addToQueue(track.uri, track.name, track.artist, track.image, track);
        });
}

function extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Queue Management
function addToQueue(uri, name, artist, image, trackData = null) {
    const track = { uri, name, artist, image, data: trackData };
    currentQueue.push(track);
    localStorage.setItem('music_queue', JSON.stringify(currentQueue));
    loadQueue();
    if (currentQueue.length === 1) {
        playCurrentTrack();
    }
}

function loadQueue() {
    const list = document.getElementById('queue-list');
    list.innerHTML = '';
    currentQueue.forEach((track, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="${track.image}" width="40" style="float: left; margin-right: 10px;">
            <div>${track.name} - ${track.artist}</div>
            <button onclick="removeFromQueue(${index})" style="float: right;">Remove</button>
        `;
        list.appendChild(li);
    });
    updatePlayerDisplay(currentQueue[0]);
}

function removeFromQueue(index) {
    currentQueue.splice(index, 1);
    localStorage.setItem('music_queue', JSON.stringify(currentQueue));
    loadQueue();
    if (currentTrackIndex >= currentQueue.length) {
        currentTrackIndex = 0;
    }
    if (currentQueue.length > 0) {
        playCurrentTrack();
    }
}

function toggleQueue() {
    const modal = document.getElementById('queue-modal');
    modal.classList.toggle('active');
    loadQueue();
}

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % currentQueue.length;
    playCurrentTrack();
}

function previousTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + currentQueue.length) % currentQueue.length;
    playCurrentTrack();
}

function playCurrentTrack() {
    const track = currentQueue[currentTrackIndex];
    if (!track) return;
    updatePlayerDisplay(track);
    if (track.data && track.data.type === 'youtube') {
        if (player) {
            player.loadVideoById(track.data.id);
            player.playVideo();
        } else {
            player = new YT.Player('player-container', {
                height: '0', // Hidden player
                width: '0',
                videoId: track.data.id,
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        }
    } else {
        // Spotify - open in app
        openInSpotify(track.uri);
    }
}

function updatePlayerDisplay(track) {
    if (!track) return;
    document.getElementById('current-track-name').textContent = track.name;
    document.getElementById('current-artist').textContent = track.artist;
    document.getElementById('current-track-img').src = track.image;
}

let isPlaying = false;
function playPause() {
    if (player && player.getPlayerState) {
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }
    isPlaying = !isPlaying;
    document.querySelector('.controls button:nth-child(2)').textContent = isPlaying ? '⏸' : '▶';
}

function onPlayerReady(event) {
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        nextTrack();
    }
}

// Playlists
function createPlaylist() {
    const name = prompt('Playlist name:');
    if (!name || !userId) {
        if (!userId) alert('Log in to Spotify first');
        return;
    }
    fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
    })
    .then(res => res.json())
    .then(data => {
        playlists.push({ id: data.id, name, tracks: [] });
        localStorage.setItem('playlists', JSON.stringify(playlists));
        loadPlaylists();
    });
}

function loadPlaylists() {
    const container = document.getElementById('playlist-list');
    container.innerHTML = '';
    playlists.forEach(playlist => {
        const div = document.createElement('div');
        div.className = 'track'; // Reuse style
        div.innerHTML = `
            <div class="track-info">
                <h4>${playlist.name}</h4>
                <p>${playlist.tracks.length} tracks</p>
            </div>
            <button onclick="viewPlaylist('${playlist.id}')">View</button>
        `;
        container.appendChild(div);
    });
    // Update select for modal
    const select = document.getElementById('playlist-select');
    select.innerHTML = '';
    playlists.forEach(playlist => {
        const option = document.createElement('option');
        option.value = playlist.id;
        option.textContent = playlist.name;
        select.appendChild(option);
    });
}

function viewPlaylist(id) {
    const playlist = playlists.find(p => p.id === id);
    document.getElementById('library-content').innerHTML = `
        <h3>${playlist.name}</h3>
        <ul>${playlist.tracks.map(t => `<li>${t.name}</li>`).join('')}</ul>
    `;
    showPage('library');
}

function selectForPlaylist(uri, name) {
    selectedTrack = { uri, name };
    document.getElementById('playlist-modal').classList.add('active');
}

function addToPlaylist() {
    const playlistId = document.getElementById('playlist-select').value;
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && selectedTrack) {
        playlist.tracks.push(selectedTrack);
        localStorage.setItem('playlists', JSON.stringify(playlists));
        // Add to Spotify playlist if URI is Spotify
        if (selectedTrack.uri.startsWith('spotify:track:')) {
            fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uris: [selectedTrack.uri] })
            });
        }
        loadPlaylists();
    }
    closePlaylistModal();
}

function closePlaylistModal() {
    document.getElementById('playlist-modal').classList.remove('active');
    selectedTrack = null;
}

// Event Listeners
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchSpotify(e.target.value);
});

// Add login button if needed
if (!accessToken) {
    const home = document.getElementById('home');
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Login to Spotify';
    loginBtn.onclick = loginSpotify;
    loginBtn.style.cssText = 'padding: 10px 20px; background: #1db954; color: white; border: none; border-radius: 4px; margin: 10px; cursor: pointer;';
    home.appendChild(loginBtn);
}

// Progress bar (basic, update on timeupdate if YT)
if (player) {
    // Listen for time updates via API
}
