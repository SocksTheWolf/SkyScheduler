async function getAccountHandle(account) {
  if (account.match(/did:plc:/i)) {
    return account;
  }
  return await fetch(`https://public.bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${account}`)
  .then((resp) => {
    if (resp.ok) {
      return resp.json().then((lookup) => {
        return lookup.did;
      });
    }
    return null;
  });
}

async function getPostCID(account, postid) {
  return await fetch(`https://public.api.bsky.app/xrpc/com.atproto.repo.getRecord?collection=app.bsky.feed.post&repo=${account}&rkey=${postid}`)
  .then((resp) => {
    if (resp.ok) {
      return resp.json().then((lookup) => {
        if (Object.prototype.hasOwnProperty.call(lookup, "cid")) {
          return lookup.cid;
        }
        return null;
      });
    }
    return null;
  });
}

async function searchBSkyMentions(query, callback) {
  const queryActors = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${query}&limit=${MAX_AUTO_COMPLETE_NAMES}`);
  if (queryActors.ok) {
    try {
      const jsonData = await queryActors.json();
      callback(jsonData.actors);
      return;
    } catch(err) {
      console.error(`fetching bsky mentionlist returned ${err}`);
    }
  }
  callback([]);
}