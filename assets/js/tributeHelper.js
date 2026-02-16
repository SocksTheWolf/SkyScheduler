function searchBSkyMentions(query, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${query}&limit=${MAX_AUTO_COMPLETE_NAMES}`);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      // Request good
      if (xhr.status === 200) {
        try {
          const returnData = JSON.parse(xhr.responseText);
          callback(returnData.actors);
          return;
        } catch(err) {
          console.error(`failed to parse bsky mention list ${err}`)
        }
      }
      console.error(`fetching bluesky mentionlist returned ${xhr.status}`);
      callback([]);
    }
  }
  xhr.send();
}

function tributeToElement(el) {
  const mentionTribute = new Tribute({
    menuItemTemplate: function(item) {
      const avatarStr = item.original.avatar !== undefined ? `<img src="${item.original.avatar}">` : "";
      return `${avatarStr}<span><code>${item.original.displayName}</code><br /> <small>@${item.original.handle}</small></span>`;
    },
    values: function(text, cb) {
      searchBSkyMentions(text, item => cb(item));
    },
    noMatchTemplate: () => '<span class="acBskyHandle">No Match Found</span>',
    lookup: 'handle',
    fillAttr: 'handle',
    spaceSelectsMatch: true,
    menuItemLimit: MAX_AUTO_COMPLETE_NAMES,
    menuShowMinLength: MIN_CHAR_AUTO_COMPLETE_NAMES,
    menuContainer: el.parentNode
  });

  el.addEventListener("detach", () => {
    mentionTribute.detach(el);
  });
  mentionTribute.attach(el);
}

function detachTribute(el) {
  el.dispatchEvent(new Event("detach"));
}