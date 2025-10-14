const songsGrid = document.getElementById('songsGrid');
const emptyState = document.getElementById('emptyState');
const addSongBtn = document.getElementById('addSongBtn');
const addSongDialog = document.getElementById('addSongDialog');
const closeAddSong = document.getElementById('closeAddSong');
const fetchSongBtn = document.getElementById('fetchSongBtn');
const youtubeLinkInput = document.getElementById('youtubeLinkInput');

const managePlaylistsBtn = document.getElementById('managePlaylistsBtn');
const managePlaylistsDialog = document.getElementById('managePlaylistsDialog');
const closeManagePlaylists = document.getElementById('closeManagePlaylists');
const playlistsList = document.getElementById('playlistsList');
const newPlaylistName = document.getElementById('newPlaylistName');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');

const musicPlayer = document.getElementById('musicPlayer');
const playerTitle = document.getElementById('playerTitle');
const playerThumbnail = document.getElementById('playerThumbnail');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeSlider = document.getElementById('volumeSlider');

let songs = JSON.parse(localStorage.getItem('songs')) || [];
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
let currentIndex = -1;
let audio = new Audio();

// ---- Utility ----
function saveData() {
    localStorage.setItem('songs', JSON.stringify(songs));
    localStorage.setItem('playlists', JSON.stringify(playlists));
}

// ---- UI Rendering ----
function renderSongs() {
    songsGrid.innerHTML = '';
    if (songs.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';
    songs.forEach((song, index) => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.innerHTML = `
            <img src="${song.thumbnail}" alt="">
            <div class="song-card-info">${song.title}</div>
        `;
        card.addEventListener('click', () => playSong(index));
        songsGrid.appendChild(card);
    });
}

// ---- YouTube Fetch ----
async function fetchYouTubeData(link) {
    const videoId = link.split("v=")[1]?.split("&")[0];
    if (!videoId) return alert("Invalid YouTube link!");
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    return {
        title: data.title || "Unknown Title",
        thumbnail: data.thumbnail_url || "",
        url: `https://www.youtube.com/watch?v=${videoId}`
    };
}

// ---- Music Player ----
function playSong(index) {
    const song = songs[index];
    if (!song) return;
    currentIndex = index;
    playerTitle.textContent = song.title;
    playerThumbnail.src = song.thumbnail;
    musicPlayer.classList.remove('hidden');
    audio.src = song.url;
    audio.play();
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
}

playPauseBtn.onclick = () => {
    if (audio.paused) {
        audio.play();
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        audio.pause();
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
};

volumeSlider.oninput = e => { audio.volume = e.target.value; };

// ---- Buttons & Dialogs ----
addSongBtn.onclick = () => addSongDialog.classList.add('show');
closeAddSong.onclick = () => addSongDialog.classList.remove('show');
fetchSongBtn.onclick = async () => {
    const link = youtubeLinkInput.value.trim();
    if (!link) return;
    const data = await fetchYouTubeData(link);
    songs.push(data);
    saveData();
    youtubeLinkInput.value = '';
    addSongDialog.classList.remove('show');
    renderSongs();
};

managePlaylistsBtn.onclick = () => {
    managePlaylistsDialog.classList.add('show');
    renderPlaylists();
};
closeManagePlaylists.onclick = () => managePlaylistsDialog.classList.remove('show');

createPlaylistBtn.onclick = () => {
    const name = newPlaylistName.value.trim();
    if (!name) return;
    playlists.push({ name, songs: [] });
    newPlaylistName.value = '';
    saveData();
    renderPlaylists();
};

function renderPlaylists() {
    playlistsList.innerHTML = '';
    playlists.forEach((pl, i) => {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        div.textContent = pl.name;
        playlistsList.appendChild(div);
    });
}

// ---- Initialize ----
renderSongs();
