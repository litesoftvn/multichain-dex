/* Moralis init code */
const serverUrl = "https://wh8r5pj5zptv.usemoralis.com:2053/server";
const appId = "LksPhCNEF1OGwW5OhMVamzE21bRnnyRYqZiid39m";
const mumbaiQuickSwapRouterContract = '0x4Bc51fC076A3044Af710227eA94A17AE5CcB8FdF';
let tokenSelection;
let contract = null;
let owner = null;
let web3 = null;
const storage = window.localStorage;

import {erc20Abi} from '../abis/erc20Abi.js';
import {routerAbi} from '../abis/routerAbi.js';

let swapPair = {
    "from": { "address": null, "balance": 0, "decimals": 0, "allowance": 0 },
    "to": { "address": null, "balance": 0, "decimals": 0, "allowance": 0 }
}

let liquidityPair = {
    "from": { "address": null, "balance": 0, "decimals": 0, "allowance": 0 },
    "to": { "address": null, "balance": 0, "decimals": 0, "allowance": 0 }
}

const tokens = {
  '0x326C977E6efc84E512bB9C30f76E30c160eD06FB': {
      'symbol': 'LINK',
      'address': '0x326C977E6efc84E512bB9C30f76E30c160eD06FB',
      'logoURI': 'https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png',
      'decimals': 18,
  },
  '0xf45b409a2b978ec02Bb6084e6Acc42867a78Ee9c': {
      'symbol': 'VIK',
      'address': '0xf45b409a2b978ec02Bb6084e6Acc42867a78Ee9c',
      'logoURI': 'https://tokens.1inch.io/0x17ac188e09a7890a1844e5e65471fe8b0ccfadf3.png',
      'decimals': 18
  }
}

function getListTokens() {
  const tokenString = storage.getItem("tokens");
  if (tokenString) {
    return JSON.parse(tokenString);
  }
  return tokens;
}

function addCustomToken(address, symbol, decimals, logoURI) {
  let customTokenData = {
    'symbol': symbol,
    'address': address,
    'logoURI': 'https://tokens.1inch.io/0x17ac188e09a7890a1844e5e65471fe8b0ccfadf3.png',
    'decimals': decimals
  }
  tokens[address] = customTokenData;
  storage.setItem("tokens", JSON.stringify(tokens));
  updateListAvailableTokens(getListTokens());
}

/* Authentication code */
async function login() {
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
    }
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    owner = account;
    document.getElementById("btn-login").innerHTML = owner;
}

async function init() {
    await updateListAvailableTokens(getListTokens());    
    web3 = new Web3(window.ethereum);
    await window.ethereum.enable();
    console.log(web3);
}

async function updateListAvailableTokens(tokens) {
    const tokenList = document.getElementById("token_list");
    if (tokenList == null) { return; }
    
    while (tokenList.lastChild) {
      tokenList.removeChild(tokenList.lastChild);
    }
    for (const address in tokens) {
        let token = tokens[address];
        let div = document.createElement("div");

        div.className = "token_row";
        let html = `
            <img class="token_list_img" src="${token.logoURI}">
            <span class="token_list_text">${token.symbol}</span>
        `
        div.innerHTML = html;
        div.onclick = (() => { selectToken(token.address); });
        tokenList.appendChild(div);
    }
}

async function selectToken(address) {
    closeModal();

    const contract = new web3.eth.Contract(erc20Abi, address);
    const decimals = await contract.methods.decimals().call();
    const balance = await contract.methods.balanceOf(owner).call();    
    const readableBalance = balance / 10 ** decimals;

    if (tokenSelection == 'from') {
        swapPair.from.address = address;
        swapPair.from.balance = readableBalance;
    } else if (tokenSelection == 'to') {
        swapPair.to.address = address;
        swapPair.to.balance = readableBalance;
    } else if (tokenSelection == 'liquidity_from') {
        liquidityPair.from.address = address;
        liquidityPair.from.balance = readableBalance;
    } else {
        liquidityPair.to.address = address;
        liquidityPair.to.balance = readableBalance;
    }
    updateUI();
}

function updateUI() {
    if (!!swapPair.from.address) {
        document.getElementById("from_token_icon").src = tokens[swapPair.from.address].logoURI;
        document.getElementById("from_token_text").innerHTML = tokens[swapPair.from.address].symbol;
        document.getElementById("from_token_amount").value = swapPair.from.balance;
    }

    if (!!swapPair.to.address) {
        document.getElementById("to_token_icon").src = tokens[swapPair.to.address].logoURI;
        document.getElementById("to_token_text").innerHTML = tokens[swapPair.to.address].symbol;
        document.getElementById("to_token_amount").value = swapPair.to.balance;
    }

    if (!!liquidityPair.from.address) {
        document.getElementById("liquidity_from_token_icon").src = tokens[liquidityPair.from.address].logoURI;
        document.getElementById("liquidity_from_token_text").innerHTML = tokens[liquidityPair.from.address].symbol;
        document.getElementById("liquidity_from_token_amount").value = liquidityPair.from.balance;
        updateApprovalButtonForAddLiquidity();
    }

    if (!!liquidityPair.to.address) {
        document.getElementById("liquidity_to_token_icon").src = tokens[liquidityPair.to.address].logoURI;
        document.getElementById("liquidity_to_token_text").innerHTML = tokens[liquidityPair.to.address].symbol;
        document.getElementById("liquidity_to_token_amount").value = liquidityPair.to.balance;
        updateApprovalButtonForAddLiquidity();
    }
}

function updateApprovalButtonForAddLiquidity() {
    const approvalBtn = $('#liquidity_approve_token');
    if (liquidityPair.from.balance > 0 && liquidityPair.from.balance > liquidityPair.from.allowance) {
        approvalBtn.text('Approve ' + tokens[liquidityPair.from.address].symbol);
        approvalBtn.data('address', liquidityPair.from.address);
        approvalBtn.show();
    } else if (liquidityPair.to.balance > 0 && liquidityPair.to.balance > liquidityPair.to.allowance) {
        approvalBtn.text('Approve ' + tokens[liquidityPair.to.address].symbol);
        approvalBtn.data('address', liquidityPair.to.address);
        approvalBtn.show();
    }
}

function openModal(selection) {
    document.getElementById("token_modal").style.display = "block";
    tokenSelection = selection;
}

function closeModal() {
    document.getElementById("token_modal").style.display = "none";
}

async function getQuote() {
    // let amount = Number(Moralis.Units.ETH(document.getElementById('from_token_amount').value));
    // const quote = await Moralis.Plugins.oneInch.quote({
    //     chain: 'mumbai',
    //     fromTokenAddress: swapPair.from.address,
    //     toTokenAddress: swapPair.to.address,
    //     amount: amount
    // });
    // document.getElementById("to_token_amount").value = quote.toTokenAmount / 10 ** quote.toToken.decimals;
}

async function processCustomToken() {
  const add = $("#custom_token_address").val();
  if (add == "") { return; }
  if (!tokens[add] && web3 != null) {
    contract = new web3.eth.Contract(erc20Abi, add);
    const decimals = await contract.methods.decimals().call();
    const symbol = await contract.methods.symbol().call();
    addCustomToken(add, symbol, decimals, '');
    $("#custom_token_address").val("");
    // const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    // const account = accounts[0];
    
    // await contract.methods.approve(mumbaiQuickSwapRouterContract, web3.utils.toWei('10000000000000000000', 'ether')).send({ from: owner });
  }
}

$(document).ready(() => {
    init();
    document.getElementById("from_token_select").onclick = (() => { openModal('from'); });
    document.getElementById("to_token_select").onclick = (() => { openModal('to'); });
    document.getElementById("liquidity_approve_token").onclick = (async () => {
        let address = $('#liquidity_approve_token').data('address');
        console.log(address);
        // console.log(web3);
        contract = new web3.eth.Contract(erc20Abi, address);
        //web3.utils.toWei(new web3.utils.BN(10 ** 12), 'ether')
        console.log(owner);
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        
        await contract.methods.approve(mumbaiQuickSwapRouterContract, web3.utils.toWei('10000000000000000000', 'ether')).send({ from: account });
        $('#liquidity_approve_token').hide();
    });
    document.getElementById("submit_add_liquidity").onclick = (async () => {
        const gasPrice = await web3.eth.getGasPrice();
        const router = new web3.eth.Contract(routerAbi, mumbaiQuickSwapRouterContract);
        const dataOption = {
            from: owner,
            value: web3.utils.toWei('0.1')
        }
        new web3.utils.BN()
        console.log(owner);
        const deadline = web3.utils.toHex(Math.round(Date.now()/1000)+60*20);
        await router.methods.addLiquidityETH('0xf45b409a2b978ec02Bb6084e6Acc42867a78Ee9c', '100000000000000000000000', '10', '1', owner, deadline).send(dataOption);
        // await router.methods.addLiquidityETH(mumbaiQuickSwapRouterContract, '10000000000000000000').send({ from: account });
    });

    document.getElementById("liquidity_from_token_select").onclick = (() => { openModal('liquidity_from'); });
    document.getElementById("liquidity_to_token_select").onclick = (() => { openModal('liquidity_to'); });

    document.getElementById("model_close_btn").onclick = closeModal;
    document.getElementById("btn-login").onclick = login;
    document.getElementById("from_token_amount").onblur = getQuote;
    document.getElementById("to_token_amount").onblur = getQuote;
    document.getElementById("custom_token_address").onblur = processCustomToken;

    login();
})
// "[ethjs-query] while formatting outputs from RPC '{"value":{"code":-32603,"data":{"code":-32000,"message":"exceeds block gas limit"}}}'"