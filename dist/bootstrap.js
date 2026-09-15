const gameUrl = new URL('./game.js', import.meta.url);

async function boot() {
  const response = await fetch(gameUrl, {cache: 'no-store'});
  if (!response.ok) throw new Error(`Game bootstrap failed (${response.status})`);
  let source = await response.text();
  const base = new URL('.', gameUrl);

  source = source.replace(/from\s+(['"])(\.\/[^'"]+)\1/g, (_m, quote, spec) =>
    `from ${quote}${new URL(spec, base).href}${quote}`
  );
  source = source.replace(/import\s+(['"])(\.\/[^'"]+)\1/g, (_m, quote, spec) =>
    `import ${quote}${new URL(spec, base).href}${quote}`
  );

  const anchor = "const canvas=$('world'),mini=$('minimap'),miniCtx=mini.getContext('2d');";
  const exposure = `${anchor}\nwindow.__PADOVA_RUNTIME__={get state(){return state;},get scene(){return scene;},get camera(){return camera;},get player(){return player;},get terrain(){return terrain;},get cars(){return cars;},get people(){return people;},get renderer(){return renderer;},start:()=>start()};`;
  if (!source.includes(anchor)) throw new Error('Padova runtime hook could not be installed');
  source = source.replace(anchor, exposure);
  source = source.replace(
    "It does not contain photographic buildings, enterable interiors, multiplayer or GTA’s full systems.",
    "It does not contain photographic buildings, enterable interiors or GTA’s full systems. Optional online mode supports up to five named players in the shared Padova session."
  );

  const blobUrl = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
  try {
    await import(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  const {installOnlineMode} = await import('./multiplayer.js');
  installOnlineMode(window.__PADOVA_RUNTIME__);
}

boot().catch(error => {
  console.error(error);
  const loading = document.getElementById('loadingText');
  const play = document.getElementById('playBtn');
  if (loading) {
    loading.className = 'fatal';
    loading.textContent = 'The city could not start. Reload to try again.';
  }
  if (play) {
    play.disabled = false;
    play.textContent = 'Reload city';
    play.onclick = () => location.reload();
  }
});
