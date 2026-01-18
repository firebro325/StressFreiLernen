const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzkNocTapN9nrCqhUgTx8rAMufYTf5bUUMf-DUEs7GHzoakMzEBBEE0eHUctFI26HCV/exec";

export async function adminLogin(username, password) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "admin_login", username, password }),
  });
  return res.json();
}

export async function adminList({ token, query = "", sortDir = "asc" }) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "admin_list", token, query, sortDir }),
  });
  return res.json();
}

export async function adminDelete({ token, id }) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "admin_delete", token, id }),
  });
  return res.json();
}
