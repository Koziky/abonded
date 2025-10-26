// Global vars
let currentQueue = JSON.parse(localStorage.getItem('music_queue')) || [];
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
let currentTrackIndex = 0;
let audioPlayer = document.getElementById('audio-player');
let ytPlayer;
let isPlaying = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPlaylists();
    loadQueue();
    showPage('home');
    loadFeaturedSongs();
    setupEventListeners();
    onYouTubeIframeAPIReady();
});

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-menu a[data-page="${pageId}"]`).classList.add('active');
}

// Event Listeners
function setupEventListeners() {
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(link.dataset.page);
        });
    });

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', nextTrack);
}

// Song Upload and Addition
function uploadAudio() {
    const fileInput = document.getElementById('audio-upload-main') || document.getElementById('audio-upload');
    const file = fileInput.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const track = {
            name: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Uploaded',
            image: 'https://via.placeholder.com/150',
            type: 'audio',
            url
        };
        addToQueue(track.url, track.name, track.artist, track.image, track);
        displayPreview(track, 'upload-preview');
        fileInput.value = ''; // Reset input
    }
}

function addYouTubeSong() {
    const url = document.getElementById('yt-url-main')?.value || document.getElementById('yt-url').value;
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
        alert('Invalid YouTube URL');
        return;
    }
    fetch(`https://noembed.com/embed?dataType=json&url=${url}`)
        .then(res => res.json())
        .then(data => {
            const track = {
                id: videoId,
                name: data.title,
                artist: 'YouTube',
                image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                type: 'youtube',
                url
            };
            addToQueue(track.url, track.name, track.artist, track.image, track);
            displayPreview(track, 'upload-preview');
        })
        .catch(() => {
            const track = {
                id: videoId,
                name: 'YouTube Track',
                artist: 'Custom',
                image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                type: 'youtube',
                url
            };
            addToQueue(track.url, track.name, track.artist, track.image, track);
            displayPreview(track, 'upload-preview');
        });
    if (document.getElementById('yt-url-main')) document.getElementById('yt-url-main').value = '';
    else document.getElementById('yt-url').value = '';
}

function extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function displayPreview(track, containerId) {
    const container = document.getElementById(containerId);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <img src="${track.image}" alt="${track.name}">
        <h4>${track.name}</h4>
        <p>${track.artist}</p>
        <button onclick="addToQueue('${track.url}', '${track.name}', '${track.artist}', '${track.image}', ${JSON.stringify(track)})">Add to Queue</button>
        <button onclick="selectForPlaylist('${track.url}', '${track.name}')">Add to Playlist</button>
    `;
    container.appendChild(card);
}

// Queue Management
function addToQueue(url, name, artist, image, trackData = null) {
    const track = { url, name, artist, image, data: trackData };
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
            <img src="${track.image}" alt="${track.name}">
            <span>${track.name} - ${track.artist}</span>
            <button onclick="removeFromQueue(${index})">Remove</button>
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
        if (ytPlayer) {
            ytPlayer.loadVideoById(track.data.id);
            ytPlayer.playVideo();
        } else {
            ytPlayer = new YT.Player('player-container', {
                height: '0',
                width: '0',
                videoId: track.data.id,
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        }
    } else {
        audioPlayer.src = track.url;
        audioPlayer.play();
    }
    isPlaying = true;
    document.getElementById('play-pause-btn').textContent = '⏸';
}

function updatePlayerDisplay(track) {
    if (!track) {
        document.getElementById('current-track-name').textContent = 'No track playing';
        document.getElementById('current-artist').textContent = '';
        document.getElementById('current-track-img').src = 'https://via.placeholder.com/50';
        return;
    }
    document.getElementById('current-track-name').textContent = track.name;
    document.getElementById('current-artist').textContent = track.artist;
    document.getElementById('current-track-img').src = track.image;
}

function updateProgress() {
    if (!audioPlayer.src) return;
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-time').textContent = formatTime(audioPlayer.currentTime);
    document.getElementById('duration').textContent = formatTime(audioPlayer.duration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function playPause() {
    if (currentQueue[currentTrackIndex]?.data?.type === 'youtube' && ytPlayer) {
        if (isPlaying) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
    } else if (audioPlayer.src) {
        if (isPlaying) audioPlayer.pause();
        else audioPlayer.play();
    }
    isPlaying = !isPlaying;
    document.getElementById('play-pause-btn').textContent = isPlaying ? '⏸' : '▶';
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
    if (name) {
        playlists.push({ id: Date.now(), name, tracks: [] });
        localStorage.setItem('playlists', JSON.stringify(playlists));
        loadPlaylists();
    }
}

function loadPlaylists() {
    const container = document.getElementById('playlist-list');
    container.innerHTML = '';
    playlists.forEach(playlist => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h4>${playlist.name}</h4>
            <p>${playlist.tracks.length} tracks</p>
            <button onclick="viewPlaylist(${playlist.id})">View</button>
        `;
        container.appendChild(card);
    });
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
        ${playlist.tracks.map(t => `<div class="card"><h4>${t.name}</h4><p>${t.artist}</p></div>`).join('')}
    `;
    showPage('library');
}

function selectForPlaylist(url, name) {
    selectedTrack = { url, name };
    document.getElementById('playlist-modal').classList.add('active');
}

function addToPlaylist() {
    const playlistId = document.getElementById('playlist-select').value;
    const playlist = playlists.find(p => p.id == playlistId);
    if (playlist && selectedTrack) {
        playlist.tracks.push(selectedTrack);
        localStorage.setItem('playlists', JSON.stringify(playlists));
        loadPlaylists();
    }
    closePlaylistModal();
}

function closePlaylistModal() {
    document.getElementById('playlist-modal').classList.remove('active');
    selectedTrack = null;
}

// Dummy Data
function loadFeaturedSongs() {
    const container = document.getElementById('featured-songs');
    const dummyTracks = [
        { name: 'Chill Vibes', artist: 'Relax', image: 'https://via.placeholder.com/150' },
        { name: 'Upbeat Tune', artist: 'Energy', image: 'https://via.placeholder.com/150' }
    ];
    dummyTracks.forEach(track => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${track.image}" alt="${track.name}">
            <h4>${track.name}</h4>
            <p>${track.artist}</p>
        `;
        container.appendChild(card);
    });
}
