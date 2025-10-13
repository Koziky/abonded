let player;
let playlist = [];
let currentIndex = 0;

// YouTube IFrame API ready
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: { 
            'playsinline': 1,
            'controls': 0,
            'rel': 0,
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

// Add song button
document.getElementById('add-btn').addEventListener('click', async () => {
    const url = document.getElementById('yt-url').value;
    const videoId = extractVideoID(url);
    if(videoId){
        // Fetch video info from YouTube Data API
        const videoInfo = await fetchVideoInfo(videoId);
        if(videoInfo){
            playlist.push(videoInfo);
            renderCards();
            if(playlist.length === 1){
                playSong(0);
            }
        }
        document.getElementById('yt-url').value = '';
    } else {
        alert('Invalid YouTube URL');
    }
});

// Extract video ID from URL
function extractVideoID(url){
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length == 11) ? match[2] : null;
}

// Fetch video info using YouTube Data API (API key required)
async function fetchVideoInfo(videoId){
    const apiKey = 'YOUR_YOUTUBE_DATA_API_KEY'; // Replace with your API key
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`);
    const data = await response.json();
    if(data.items.length > 0){
        const snippet = data.items[0].snippet;
        return {
            videoId: videoId,
            title: snippet.title,
            thumbnail: snippet.thumbnails.medium.url
        };
    }
    return null;
}

// Render song cards
function renderCards(){
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    playlist.forEach((song, index)=>{
        const card = document.createElement('div');
        card.classList.add('song-card');
        card.innerHTML = `
            <img src="${song.thumbnail}" alt="${song.title}">
            <div class="song-title">${song.title}</div>
        `;
        card.addEventListener('click', ()=>{
            playSong(index);
        });
        container.appendChild(card);
    });
}

// Play a song by index
function playSong(index){
    currentIndex = index;
    player.loadVideoById(playlist[index].videoId);
    updateActiveCard();
}

// Highlight active card
function updateActiveCard(){
    document.querySelectorAll('.song-card').forEach((card, idx)=>{
        card.style.border = idx === currentIndex ? '2px solid #ff4f5a' : 'none';
    });
}

// Play/pause
document.getElementById('play').addEventListener('click', ()=>{
    const state = player.getPlayerState();
    if(state === YT.PlayerState.PLAYING){
        player.pauseVideo();
    } else {
        player.playVideo();
    }
});

// Next
document.getElementById('next').addEventListener('click', ()=>{
    if(playlist.length === 0) return;
    currentIndex = (currentIndex + 1) % playlist.length;
    playSong(currentIndex);
});

// Previous
document.getElementById('prev').addEventListener('click', ()=>{
    if(playlist.length === 0) return;
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playSong(currentIndex);
});

// Volume control
document.getElementById('volume').addEventListener('input', (e)=>{
    player.setVolume(e.target.value);
});

// Auto next on end
function onPlayerStateChange(event){
    if(event.data === YT.PlayerState.ENDED){
        document.getElementById('next').click();
    }
}
