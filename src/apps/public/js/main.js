/* Moralis init code */
const serverUrl = "https://wh8r5pj5zptv.usemoralis.com:2053/server";
const appId = "LksPhCNEF1OGwW5OhMVamzE21bRnnyRYqZiid39m";
const erc20Abi = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
];

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
        document.getElementById("btn-login").innerHTML = Moralis.User.current().get("ethAddress");
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
    const tokenList = document.getElementById("token_list");
    tokens = {
        '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39': {
            'symbol': 'LINK',
            'address': '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
            'logoURI': 'https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png'
        },
        '0x0fa8074acf7bbc635a44e0f22c3db7ffd3d8e39f': {
            'symbol': 'MEME',
            'address': '0x0fa8074acf7bbc635a44e0f22c3db7ffd3d8e39f',
            'logoURI': 'https://tokens.1inch.io/0x17ac188e09a7890a1844e5e65471fe8b0ccfadf3.png'
        }
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
    if (tokenSelection == 'from') {
        tradingPair.from.address = address;
        let options = { chain: "polygon", addresses: Moralis.User.current() }
        // const tokenMetadata = await Moralis.Web3API.token.getTokenMetadata(options);
        // console.log(tokenMetadata);
        const balances = await Moralis.Web3.getAllERC20(options);
        console.log('balances:');
        console.log(balances);

        const web3 = await Moralis.enableWeb3();
        // const web3 = new Web3(web3.current);
        console.log('address', address);
        // const contract = new web3.eth.Contract(abi, address);
        // let decimals = await contract.methods.decimals().call();
        // let balance = await contract.methods.balanceOf(Moralis.User.current().get("ethAddress")).call();

        // console.log(decimals);
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

    if (Moralis.User.current()) {
        document.getElementById("btn-login").innerHTML = Moralis.User.current().get("ethAddress");
    }
    // document.getElementById("btn-logout").onclick = logOut;
})
