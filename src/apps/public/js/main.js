/* Moralis init code */
const serverUrl = "https://wh8r5pj5zptv.usemoralis.com:2053/server";
const appId = "LksPhCNEF1OGwW5OhMVamzE21bRnnyRYqZiid39m";
const mumbaiQuickSwapRouterContract = '0x4Bc51fC076A3044Af710227eA94A17AE5CcB8FdF';
let tokenSelection;
let contract = null;
let owner = null;
let web3 = null;
let slipPagePercentage = 3; // 3%
const storage = window.localStorage;

import { erc20Abi } from '../abis/erc20Abi.js';
import { routerAbi } from '../abis/routerAbi.js';

// The addresses of the eth wrapped tokens
// e.g: WETH, WBNB, WMATIC
const ethTokensAddresses = [
    '0x9c3c9283d3e44854697cd22d3faa240cfb032889'
]

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
        'logoURI': 'https://tokens.1inch.io/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270.png',
        'decimals': 18,
    },
    '0x9c3c9283d3e44854697cd22d3faa240cfb032889': {
        'symbol': 'MATIC',
        'address': '0x9c3c9283d3e44854697cd22d3faa240cfb032889',
        'logoURI': 'https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png',
        'decimals': 18
    },
    '0xf45b409a2b978ec02Bb6084e6Acc42867a78Ee9c': {
        'symbol': 'VIK',
        'address': '0xf45b409a2b978ec02Bb6084e6Acc42867a78Ee9c',
        'logoURI': 'https://tokens.1inch.io/0x17ac188e09a7890a1844e5e65471fe8b0ccfadf3.png',
        'decimals': 18
    },
}

function getListTokens() {
    const tokenString = storage.getItem("tokens");
    if (tokenString) {
        const storedToken = JSON.parse(tokenString);
        tokens = { ...tokens, ...storedToken};
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
    const readableAllowance = allowance / 10 ** decimals;

    if (tokenSelection == 'from') {
        swapPair.from.address = address;
        swapPair.from.balance = readableBalance;
        swapPair.from.allowance = readableAllowance;
        swapPair.from.decimals = decimals;
    } else if (tokenSelection == 'to') {
        swapPair.to.address = address;
        swapPair.to.balance = readableBalance;
        swapPair.to.allowance = readableAllowance;
        swapPair.to.decimals = decimals;
    } else if (tokenSelection == 'liquidity_from') {
        liquidityPair.from.address = address;
        liquidityPair.from.balance = readableBalance;
        liquidityPair.from.allowance = readableAllowance;
        liquidityPair.from.decimals = decimals;
    } else {
        liquidityPair.to.address = address;
        liquidityPair.to.balance = readableBalance;
        liquidityPair.to.allowance = readableAllowance;
        liquidityPair.to.decimals = decimals;
    }
    updateUI();
}

function updateUI() {
    if (!!swapPair.from.address) {
        document.getElementById("from_token_icon").src = tokens[swapPair.from.address].logoURI;
        document.getElementById("from_token_text").innerHTML = tokens[swapPair.from.address].symbol;
        document.getElementById("from_token_amount").value = swapPair.from.swapBalance;
        updateApprovalButtonForSwap();
    }

    if (!!swapPair.to.address) {
        document.getElementById("to_token_icon").src = tokens[swapPair.to.address].logoURI;
        document.getElementById("to_token_text").innerHTML = tokens[swapPair.to.address].symbol;
        document.getElementById("to_token_amount").value = swapPair.to.swapBalance;
        updateApprovalButtonForSwap();
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

function updateApprovalButtonForSwap() {
    const approvalBtn = $('#swap_approve_token');
    approvalBtn.hide();
    if (swapPair.from.balance > 0 && swapPair.from.balance > swapPair.from.allowance) {
        approvalBtn.text('Approve ' + tokens[swapPair.from.address].symbol);
        approvalBtn.data('address', swapPair.from.address);
        approvalBtn.show();
    } else if (swapPair.to.balance > 0 && swapPair.to.balance > swapPair.to.allowance) {
        approvalBtn.text('Approve ' + tokens[swapPair.to.address].symbol);
        approvalBtn.data('address', swapPair.to.address);
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
        swapPair.from.swapBalance = parseFloat(web3.utils.fromWei(etherAmount, getEtherUnit(web3.utils.unitMap, swapPair.from.decimals))).toFixed(6);
        swapPair.to.swapBalance = parseFloat(web3.utils.fromWei(result[1], getEtherUnit(web3.utils.unitMap, swapPair.to.decimals))).toFixed(6);
    } else {
        swapPair.from.swapBalance = parseFloat(web3.utils.fromWei(result[1], getEtherUnit(web3.utils.unitMap, swapPair.from.decimals))).toFixed(6);
        swapPair.to.swapBalance = parseFloat(web3.utils.fromWei(etherAmount, getEtherUnit(web3.utils.unitMap, swapPair.to.decimals))).toFixed(6);
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
    const deadline = web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 20);
    const unitMap = web3.utils.unitMap;
    
    if (ethTokensAddresses.includes(liquidityPair.from.address) || ethTokensAddresses.includes(liquidityPair.to.address)) {
        const fromValue = web3.utils.toWei($('#liquidity_from_token_amount').val(), getEtherUnit(unitMap, liquidityPair.from.decimals));
        const toValue = web3.utils.toWei($('#liquidity_to_token_amount').val(), getEtherUnit(unitMap, liquidityPair.to.decimals));
        dataOption.value = ethTokensAddresses.includes(liquidityPair.from.address) ? fromValue : toValue;
        const tokenAddress = ethTokensAddresses.includes(liquidityPair.from.address) ? liquidityPair.to.address : liquidityPair.from.address;
        const tokenAmount = ethTokensAddresses.includes(liquidityPair.from.address) ? toValue : fromValue;
        await router.methods.addLiquidityETH(tokenAddress, tokenAmount, '1', '1', owner, deadline).send(dataOption);
    } else {
        await router.methods.addLiquidity(
            liquidityPair.from.address,
            liquidityPair.to.address,
            web3.utils.toWei($('#liquidity_from_token_amount').val(), getEtherUnit(unitMap, liquidityPair.from.decimals)),
            web3.utils.toWei($('#liquidity_to_token_amount').val(), getEtherUnit(unitMap, liquidityPair.to.decimals)),
            '1',
            '1',
            owner, deadline).send(dataOption);
    }    
}

async function submitAddLiquidityEth() {
    const router = new web3.eth.Contract(routerAbi, mumbaiQuickSwapRouterContract);
    const dataOption = {
        from: owner,
        value: web3.utils.toWei($('#liquidity_from_token_amount').val(), getEtherUnit(unitMap, liquidityPair.from.decimals))
    }
    const deadline = web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 20);
    const unitMap = web3.utils.unitMap;
    await router.methods.addLiquidityETH('0xf45b409a2b978ec02Bb6084e6Acc42867a78Ee9c', '100000000000000000000000', '10', '1', owner, deadline).send(dataOption);
}

async function submitApproveToken(id) {
    let address = $('#' + id).data('address');
    contract = new web3.eth.Contract(erc20Abi, address);
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];

    await contract.methods.approve(mumbaiQuickSwapRouterContract, web3.utils.toWei('10000000000000000000', 'ether')).send({ from: account });
    $('#' + id).hide();
}

async function submitSwap() {
    if (swapPair.from.swapBalance == '' || swapPair.to.swapBalance == '') {
        return;
    }
    const router = new web3.eth.Contract(routerAbi, mumbaiQuickSwapRouterContract);
    const dataOption = {
        from: owner
    }
    const deadline = web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 20);
    const unitMap = web3.utils.unitMap;
    
    if (ethTokensAddresses.includes(swapPair.from.address)) {
        // swap from eth to another token
        dataOption.value = web3.utils.toWei(swapPair.from.swapBalance, getEtherUnit(unitMap, swapPair.from.decimals));
        // take slip page into account
        const swapBalance = (parseFloat(swapPair.to.swapBalance) / 100 * (100 - slipPagePercentage)).toFixed(6);
        // swap
        await router.methods.swapETHForExactTokens(
            web3.utils.toWei(swapBalance, getEtherUnit(unitMap, swapPair.to.decimals)),
            [swapPair.from.address, swapPair.to.address],
            owner,
            deadline).send(dataOption);
    } else if (ethTokensAddresses.includes(swapPair.to.address)) {
        // swap tokens for eth
        // take slip page into account
        const expectedEth = web3.utils.toWei((parseFloat(swapPair.to.swapBalance) / 100 * (100 - slipPagePercentage)).toFixed(6), getEtherUnit(unitMap, swapPair.to.decimals));
        const amountInMax = web3.utils.toWei(swapPair.from.swapBalance, getEtherUnit(unitMap, swapPair.from.decimals));
        await router.methods.swapTokensForExactETH(expectedEth, amountInMax, [swapPair.from.address, swapPair.to.address], owner, deadline).send(dataOption);
    } else {
        // Performs the swap from tokens to tokens
        await router.methods.swapExactTokensForTokens(
            web3.utils.toWei(swapPair.from.swapBalance, getEtherUnit(unitMap, swapPair.from.decimals)),
            '1',
            [swapPair.from.address, swapPair.to.address],
            owner,
            deadline).send(dataOption);
    }
}

$(document).ready(() => {
    init();
    document.getElementById("from_token_select").onclick = (() => { openModal('from'); });
    document.getElementById("to_token_select").onclick = (() => { openModal('to'); });
    document.getElementById("swap_approve_token").onclick = (() => { submitApproveToken('swap_approve_token'); });
    document.getElementById("liquidity_approve_token").onclick = (() => { submitApproveToken('liquidity_approve_token'); });
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
