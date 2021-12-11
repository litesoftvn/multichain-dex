/* Moralis init code */
const serverUrl = "https://wh8r5pj5zptv.usemoralis.com:2053/server";
const appId = "LksPhCNEF1OGwW5OhMVamzE21bRnnyRYqZiid39m";
Moralis.start({ serverUrl, appId });

let tokenSelection;
let tokens;

let tradingPair = {
    "from": { "address": null },
    "to": { "address": null }
}

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
    tokens = result.tokens;
    for (const address in tokens) {
        let token = result.tokens[address];
        let div = document.createElement("div");

        div.className = "token_row";
        let html = `
            <img class="token_list_img" src="${token.logoURI}">
            <span class="token_list_text">${token.symbol}</span>
        `
        div.innerHTML = html;
        div.onclick = (() => { selectToken(address); });
        tokenList.appendChild(div);
    }
}

async function selectToken(address) {
    closeModal();
    if (tokenSelection == 'from') {
        tradingPair.from.address = address;
    } else {
        tradingPair.to.address = address;
    }

    updateUI();
}

function updateUI() {
    if (!!tradingPair.from.address) {
        document.getElementById("from_token_icon").src = tokens[tradingPair.from.address].logoURI;
        document.getElementById("from_token_text").innerHTML = tokens[tradingPair.from.address].symbol;
    }

    if (!!tradingPair.to.address) {
        document.getElementById("to_token_icon").src = tokens[tradingPair.to.address].logoURI;
        document.getElementById("to_token_text").innerHTML = tokens[tradingPair.to.address].symbol;
    }

}

async function logOut() {
  await Moralis.User.logOut();
  console.log("logged out");
}

function openModal(selection) {
    document.getElementById("token_modal").style.display = "block";
    tokenSelection = selection;
}

function closeModal() {
    document.getElementById("token_modal").style.display = "none";
}

async function getQuote() {
    let amount = Number(Moralis.Units.ETH(document.getElementById('from_token_amount').value));
    const quote = await Moralis.Plugins.oneInch.quote({
        chain: 'polygon',
        fromTokenAddress: tradingPair.from.address,
        toTokenAddress: tradingPair.to.address,
        amount: amount
    });
    document.getElementById("to_token_amount").value = quote.toTokenAmount / 10 ** quote.toToken.decimals;
}

$(document).ready(() => {
    init();
    document.getElementById("from_token_select").onclick = (() => { openModal('from'); });
    document.getElementById("to_token_select").onclick = (() => { openModal('to'); });
    document.getElementById("model_close_btn").onclick = closeModal;
    document.getElementById("btn-login").onclick = login;
    document.getElementById("from_token_amount").onblur = getQuote;
    document.getElementById("to_token_amount").onblur = getQuote;
    // document.getElementById("btn-logout").onclick = logOut;
})
