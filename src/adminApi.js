const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzkNocTapN9nrCqhUgTx8rAMufYTf5bUUMf-DUEs7GHzoakMzEBBEE0eHUctFI26HCV/exec";

// Wichtig: text/plain => kein CORS Preflight
async function postPlain(payload) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export function adminLogin(username, password) {
  return postPlain({ action: "admin_login", username, password });
}

export function adminList({ token, query = "", sortDir = "asc" }) {
  return postPlain({ action: "admin_list", token, query, sortDir });
}

export function adminDelete({ token, id }) {
  return postPlain({ action: "admin_delete", token, id });
}
