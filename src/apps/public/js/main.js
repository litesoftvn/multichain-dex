/* Moralis init code */
const serverUrl = "https://wh8r5pj5zptv.usemoralis.com:2053/server";
const appId = "LksPhCNEF1OGwW5OhMVamzE21bRnnyRYqZiid39m";
Moralis.start({ serverUrl, appId });

/* Authentication code */
async function login() {
  let user = Moralis.User.current();
  if (!user) {
    user = await Moralis.authenticate({ signingMessage: "Log in to QuickSwap Testnet" })
      .then(function (user) {
        console.log("logged in user:", user);
        console.log(user.get("ethAddress"));
      })
      .catch(function (error) {
        console(error);
      });
  }
}

async function init() {
    await Moralis.initPlugins();
    await Moralis.enable();
    await listAvailableTokens();
}

async function listAvailableTokens() {
    const result = await Moralis.Plugins.oneInch.getSupportedTokens({
        chain: "polygon" // bsc
    });

    const tokenList = document.getElementById("token_list");
    for (address in result.tokens) {
        let token = result.tokens[address];
        let div = document.createElement("div");
        div.className = "token_row";
        let html = `
            <img class="token_list_img" src="${token.logoURI}">
            <span class="token_list_text">${token.symbol}</span>
        `
        div.innerHTML = html;
        tokenList.appendChild(div);
    }
}

async function logOut() {
  await Moralis.User.logOut();
  console.log("logged out");
}

function openModal() {
    document.getElementById("token_modal").style.display = "block";
}

function closeModal() {
    document.getElementById("token_modal").style.display = "none";
}

$(document).ready(() => {
    init();
    document.getElementById("from_token_select").onclick = openModal;
    document.getElementById("to_token_select").onclick = openModal;
    document.getElementById("model_close_btn").onclick = closeModal;
    document.getElementById("btn-login").onclick = login;
    // document.getElementById("btn-logout").onclick = logOut;
})
