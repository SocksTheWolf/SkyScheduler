// Adds autocomplete to an element
function tributeToElement(el) {
  const mentionTribute = new Tribute({
    menuItemTemplate: function(item) {
      const avatarStr = item.original.avatar !== undefined ? `<img src="${item.original.avatar}">` : "";
      return `${avatarStr}<span><code>${item.original.displayName}</code><br /> <small>@${item.original.handle}</small></span>`;
    },
    values: async function(text, cb) {
      await searchBSkyMentions(text, item => cb(item));
    },
    noMatchTemplate: () => '<span class="acBskyHandle">No Match Found</span>',
    lookup: 'handle',
    fillAttr: 'handle',
    spaceSelectsMatch: false,
    menuItemLimit: MAX_AUTO_COMPLETE_NAMES,
    menuShowMinLength: MIN_CHAR_AUTO_COMPLETE_NAMES,
    menuContainer: el.parentNode
  });

  el.addEventListener("detach", () => {
    mentionTribute.detach(el);
  });
  mentionTribute.attach(el);
}

// removes autocomplete from an element
function detachTribute(el) {
  el.dispatchEvent(new Event("detach"));
}