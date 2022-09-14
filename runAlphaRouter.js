const { AlphaRouter } = require('@uniswap/smart-order-router')
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core')
const { ethers, BigNumber } = require('ethers')
const JSBI  = require('jsbi') // jsbi@3.2.5

const V3_SWAP_ROUTER_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'

require('dotenv').config()
const WALLET_ADDRESS = process.env.WALLET_ADDRESS
const WALLET_SECRET = process.env.WALLET_SECRET
const INFURA_TEST_URL = process.env.INFURA_TEST_URL

const web3Provider = new ethers.providers.JsonRpcProvider(INFURA_TEST_URL)

const chainId = 5 // Goerli
const router = new AlphaRouter({ chainId: chainId, provider: web3Provider})

const name0 = 'Wrapped Ether'
const symbol0 = 'WETH'
const decimals0 = 18
const address0 = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'

const name1 = 'TTT token'
const symbol1 = 'TTT'
const decimals1 = 18
const address1 = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984' // uni
// const address1 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // usdc
// const address1 = '0x3845badAde8e6dFF049820680d1F14bD3903a5d0' // sand
// const address1 = '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0' //matic

const WETH = new Token(chainId, address0, decimals0, symbol0, name0)
const TTT = new Token(chainId, address1, decimals1, symbol1, name1)

const amount = '2'
const inputToken = TTT
const outputToken = WETH
const inputDecimal = 18
const addressInput = address1
const wei = ethers.utils.parseUnits(amount, inputDecimal)
const inputAmount = CurrencyAmount.fromRawAmount(inputToken, JSBI.BigInt(wei))

async function main() {
  const route = await router.route(
    inputAmount,
    outputToken,
    TradeType.EXACT_INPUT,
    {
      recipient: WALLET_ADDRESS,
      slippageTolerance: new Percent(99, 100),
      deadline: Math.floor(Date.now()/1000 + 1800)
    }
  )

  console.log(`Quote Exact In: ${route.quote.toFixed(10)}`)
  console.log(`gasPrice:`, route.gasPriceWei.toString())
  console.log(`gasPrice:`, (route.gasPriceWei * 2).toString())

  const transaction = {
    data: route.methodParameters.calldata,
    to: V3_SWAP_ROUTER_ADDRESS,
    value: BigNumber.from(route.methodParameters.value),
    from: WALLET_ADDRESS,
    gasPrice: BigNumber.from(route.gasPriceWei * 2),
    gasLimit: ethers.utils.hexlify(500000)
  }

  const wallet = new ethers.Wallet(WALLET_SECRET)
  const connectedWallet = wallet.connect(web3Provider)

  const ERC20ABI = require('./abi.json')
  const contract = new ethers.Contract(addressInput, ERC20ABI, web3Provider)
  let tx = await contract.connect(connectedWallet).approve(
    V3_SWAP_ROUTER_ADDRESS,
    wei
  )

  console.log("approve hahs:", tx.hash)

  const tradeTransaction = await connectedWallet.sendTransaction(transaction)
  console.log("trade hahs:", tradeTransaction.hash)
}

main()
