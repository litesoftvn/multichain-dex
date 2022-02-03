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
    "from": { "address": null, "balance": 0, "decimals": 0, "allowance": 0, "swapBalance": '' },
    "to": { "address": null, "balance": 0, "decimals": 0, "allowance": 0, "swapBalance": '' }
}

let liquidityPair = {
    "from": { "address": null, "balance": 0, "decimals": 0, "allowance": 0 },
    "to": { "address": null, "balance": 0, "decimals": 0, "allowance": 0 }
}

let tokens = {
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
    tokens = JSON.parse(tokenString);
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
    const allowance = await contract.methods.allowance(owner, mumbaiQuickSwapRouterContract).call();
    const readableBalance = balance / 10 ** decimals;

    if (tokenSelection == 'from') {
        swapPair.from.address = address;
        swapPair.from.balance = readableBalance;
        swapPair.from.allowance = allowance;
        swapPair.from.decimals = decimals;
    } else if (tokenSelection == 'to') {
        swapPair.to.address = address;
        swapPair.to.balance = readableBalance;
        swapPair.to.allowance = allowance;
        swapPair.to.decimals = decimals;
    } else if (tokenSelection == 'liquidity_from') {
        liquidityPair.from.address = address;
        liquidityPair.from.balance = readableBalance;
        liquidityPair.from.allowance = allowance;
        liquidityPair.from.decimals = decimals;
    } else {
        liquidityPair.to.address = address;
        liquidityPair.to.balance = readableBalance;
        liquidityPair.to.allowance = allowance;
        liquidityPair.to.decimals = decimals;
    }
    updateUI();
}

function updateUI() {
    if (!!swapPair.from.address) {
        document.getElementById("from_token_icon").src = tokens[swapPair.from.address].logoURI;
        document.getElementById("from_token_text").innerHTML = tokens[swapPair.from.address].symbol;
        document.getElementById("from_token_amount").value = swapPair.from.swapBalance;
    }

    if (!!swapPair.to.address) {
        document.getElementById("to_token_icon").src = tokens[swapPair.to.address].logoURI;
        document.getElementById("to_token_text").innerHTML = tokens[swapPair.to.address].symbol;
        document.getElementById("to_token_amount").value = swapPair.to.swapBalance;
    }

    if (!!liquidityPair.from.address) {
        document.getElementById("liquidity_from_token_icon").src = tokens[liquidityPair.from.address].logoURI;
        document.getElementById("liquidity_from_token_text").innerHTML = tokens[liquidityPair.from.address].symbol;
        updateApprovalButtonForAddLiquidity();
    }

    if (!!liquidityPair.to.address) {
        document.getElementById("liquidity_to_token_icon").src = tokens[liquidityPair.to.address].logoURI;
        document.getElementById("liquidity_to_token_text").innerHTML = tokens[liquidityPair.to.address].symbol;
        updateApprovalButtonForAddLiquidity();
    }
}

function updateApprovalButtonForAddLiquidity() {
    const approvalBtn = $('#liquidity_approve_token');
    approvalBtn.hide();
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

async function getQuoteSwap(evt) {
    if (!swapPair.from.address || !swapPair.to.address) {
        return;
    }
    swapPair.from.swapBalance = '';
    swapPair.to.swapBalance = '';

    const id = evt.srcElement.id;
    const amount = $('#' + id).val();
    
    let etherAmount = amount;
    
    let pair = []
    
    let token = swapPair.to;
    if (id == 'from_token_amount') {
        token = swapPair.from;
        pair = [swapPair.from.address, swapPair.to.address];
        // swapPair.from.swapBalance = etherAmount;
    } else {
        pair = [swapPair.to.address, swapPair.from.address];
    }
    etherAmount = web3.utils.toWei(etherAmount, getEtherUnit(web3.utils.unitMap, token.decimals));
    
    const contract = new web3.eth.Contract(routerAbi, mumbaiQuickSwapRouterContract);
    const result = await contract.methods.getAmountsOut(new web3.utils.BN(etherAmount), pair).call();

    if (id == 'from_token_amount') {
        swapPair.from.swapBalance = web3.utils.fromWei(etherAmount, getEtherUnit(web3.utils.unitMap, swapPair.from.decimals));
        swapPair.to.swapBalance = web3.utils.fromWei(result[1], getEtherUnit(web3.utils.unitMap, swapPair.to.decimals));
    } else {
        swapPair.from.swapBalance = web3.utils.fromWei(result[1], getEtherUnit(web3.utils.unitMap, swapPair.from.decimals));
        swapPair.to.swapBalance = web3.utils.fromWei(etherAmount, getEtherUnit(web3.utils.unitMap, swapPair.to.decimals));
    }
    updateUI();
}

function getEtherUnit(unitMap, decimals) {
    let zeroSum = '1';
    for (let i = 0; i < decimals; i++) {
        zeroSum += '0'
    }
    const keys = Object.keys(unitMap).filter(k => unitMap[k] == zeroSum)
    if (keys.length > 0) {
        return keys[0];
    }
    return 'ether';
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
  }
}

async function submitAddLiquidity() {
    const router = new web3.eth.Contract(routerAbi, mumbaiQuickSwapRouterContract);
    const dataOption = {
        from: owner
    }
    const deadline = web3.utils.toHex(Math.round(Date.now()/1000)+60*20);
    const unitMap = web3.utils.unitMap;
    // await router.methods.addLiquidityETH('0xf45b409a2b978ec02Bb6084e6Acc42867a78Ee9c', '100000000000000000000000', '10', '1', owner, deadline).send(dataOption);
    
    await router.methods.addLiquidity(
        liquidityPair.from.address,
        liquidityPair.to.address,
        new web3.utils.toWei($('#liquidity_from_token_amount').val(), getEtherUnit(unitMap, liquidityPair.from.decimals)),
        new web3.utils.toWei($('#liquidity_to_token_amount').val(), getEtherUnit(unitMap, liquidityPair.to.decimals)),
        '1',
        '1',
        owner, deadline).send(dataOption);
}

async function submitAddLiquidityEth() {
    const router = new web3.eth.Contract(routerAbi, mumbaiQuickSwapRouterContract);
    const dataOption = {
        from: owner,
        value: new web3.utils.toWei($('#liquidity_from_token_amount').val(), getEtherUnit(unitMap, liquidityPair.from.decimals))
    }
    const deadline = web3.utils.toHex(Math.round(Date.now()/1000)+60*20);
    const unitMap = web3.utils.unitMap;
    await router.methods.addLiquidityETH('0xf45b409a2b978ec02Bb6084e6Acc42867a78Ee9c', '100000000000000000000000', '10', '1', owner, deadline).send(dataOption);
}

async function submitApproveToken() {
    let address = $('#liquidity_approve_token').data('address');
    contract = new web3.eth.Contract(erc20Abi, address);
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    
    await contract.methods.approve(mumbaiQuickSwapRouterContract, web3.utils.toWei('10000000000000000000', 'ether')).send({ from: account });
    $('#liquidity_approve_token').hide();
}

async function submitSwap() {
    if (swapPair.from.swapBalance == '') {
        return;
    }
    const router = new web3.eth.Contract(routerAbi, mumbaiQuickSwapRouterContract);
    const dataOption = {
        from: owner
    }
    const deadline = web3.utils.toHex(Math.round(Date.now()/1000)+60*20);
    const unitMap = web3.utils.unitMap;
    await router.methods.swapExactTokensForTokens(
        web3.utils.toWei(swapPair.from.swapBalance, getEtherUnit(unitMap, swapPair.from.decimals)),
        '1',
        [swapPair.from.address, swapPair.to.address],
        owner, 
        deadline).send(dataOption);
}

$(document).ready(() => {
    init();
    document.getElementById("from_token_select").onclick = (() => { openModal('from'); });
    document.getElementById("to_token_select").onclick = (() => { openModal('to'); });
    document.getElementById("liquidity_approve_token").onclick = submitApproveToken;
    document.getElementById("submit_add_liquidity").onclick = submitAddLiquidity;

    document.getElementById("liquidity_from_token_select").onclick = (() => { openModal('liquidity_from'); });
    document.getElementById("liquidity_to_token_select").onclick = (() => { openModal('liquidity_to'); });

    document.getElementById("model_close_btn").onclick = closeModal;
    document.getElementById("btn-login").onclick = login;
    document.getElementById("from_token_amount").onblur = getQuoteSwap;
    document.getElementById("to_token_amount").onblur = getQuoteSwap;
    document.getElementById("custom_token_address").onblur = processCustomToken;
    document.getElementById("submit_swap").onclick = submitSwap;
    $('#liquidity_approve_token').hide();
    $('#swap_approve_token').hide();
    login();
})
