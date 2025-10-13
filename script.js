const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const playlist = document.getElementById('playlist');
const trackName = document.getElementById('track-name');

let tracks = Array.from(playlist.querySelectorAll('li'));
let currentTrackIndex = 0;

// Load initial track
function loadTrack(index) {
    const track = tracks[index];
    audio.src = track.dataset.src;
    trackName.textContent = track.textContent;
    updateActiveTrack();
}

// Play or pause
playBtn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playBtn.textContent = '⏸';
    } else {
        audio.pause();
        playBtn.textContent = '▶';
    }
});

// Previous track
prevBtn.addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrackIndex);
    audio.play();
    playBtn.textContent = '⏸';
});

// Next track
nextBtn.addEventListener('click', () => {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    loadTrack(currentTrackIndex);
    audio.play();
    playBtn.textContent = '⏸';
});

// Playlist click
tracks.forEach((track, index) => {
    track.addEventListener('click', () => {
        currentTrackIndex = index;
        loadTrack(index);
        audio.play();
        playBtn.textContent = '⏸';
    });
});

// Highlight current track
function updateActiveTrack() {
    tracks.forEach((track, index) => {
        track.style.background = index === currentTrackIndex ? '#ff4f5a' : 'transparent';
    });
}

// Auto-next when song ends
audio.addEventListener('ended', () => {
    nextBtn.click();
});

// Initialize
loadTrack(currentTrackIndex);
