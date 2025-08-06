function launchGame(url) {
  // Opens game in new tab
  window.open(url, '_blank');
}

document.getElementById("searchInput").addEventListener("input", function () {
  const query = this.value.toLowerCase();
  const cards = document.querySelectorAll(".game-card");

  cards.forEach(card => {
    const name = card.dataset.name.toLowerCase();
    card.style.display = name.includes(query) ? "block" : "none";
  });
});
