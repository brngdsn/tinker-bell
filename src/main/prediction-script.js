const { ipcRenderer } = require('electron')
  
const getElement = (selector) => {
  return new Promise((resolve, reject) => {
    const i = setInterval(() => {
      const e = document.querySelector(selector)
      if (e) {
        clearInterval(i)
        resolve(e)
      }
    }, 250)
  })
}

const getElements = (selector) => {
  return new Promise((resolve, reject) => {
    const i = setInterval(() => {
      const e = document.querySelectorAll(selector)
      if (e && e.length > 0) {
        clearInterval(i)
        resolve(e)
      }
    }, 250)
  })
}

const updateGames = async (init = false) => {
  try {
    const prevGameEls = await getElements('.swiper-slide.swiper-slide-prev')
    const [prevGame] = [ ...prevGameEls ]
      .map((gameEl) => {
          const direction = gameEl.children[0].children[0].children[0].children[1].children[0].children[0].children[1].children[0].getAttribute('color') === 'white' ? 'up' : 'down'
          const id = gameEl.children[0].children[0].children[0].children[0].children[1].children[0].innerText
          const __payout = gameEl.children[0].children[0].children[0].children[1].children[0].children[0].children[1].children[1].innerText
          const [_payout] = __payout.split('x')
          const payout = parseFloat(_payout)
          return {
              payout,
              direction,
              id
          }
      })
    
    const curGameEls = await getElements('.swiper-slide.swiper-slide-active')
    const [curGame] = [ ...curGameEls ]
      .map((gameEl) => {
          const direction = gameEl.children[0].children[0].children[2].children[0].children[0].children[1].children[0].getAttribute('color') === 'white' ? 'up' : 'down'
          return {
              direction,
              id: gameEl.children[0].children[0].children[0].children[1].children[0].innerText
          }
      })
    ipcRenderer.send('update-games', [prevGame, curGame, init])
  } catch {
    console.log('game closing...')
  }
}

const initUI = async () => {

  const leftPanel = document.createElement('div')
  leftPanel.id = 'left-panel-debug'
  leftPanel.style.position = 'absolute'
  leftPanel.style.zIndex = '100000000000'
  leftPanel.style.top = '0'
  document.body.appendChild(leftPanel)

  const rightPanel = document.createElement('div')
  rightPanel.id = 'right-panel-debug'
  rightPanel.style.position = 'absolute'
  rightPanel.style.zIndex = '100000000000'
  rightPanel.style.top = '0'
  rightPanel.style.right = '0'
  document.body.appendChild(rightPanel)

  const debugInfoPretty = document.createElement('div')
  debugInfoPretty.id = 'prediction-debug-info-pretty'
  debugInfoPretty.style.backgroundColor = 'white'
  debugInfoPretty.style.border = '1px solid #ccc'
  debugInfoPretty.style.margin = '15px'
  debugInfoPretty.style.padding = '15px'
  debugInfoPretty.style.height = '400px'
  debugInfoPretty.style.width = '375px'
  debugInfoPretty.style.overflowY = 'scroll'
  leftPanel.appendChild(debugInfoPretty)

  const debugInfo = document.createElement('pre')
  debugInfo.id = 'prediction-debug-info'
  debugInfo.style.backgroundColor = 'white'
  debugInfo.style.border = '1px solid #ccc'
  debugInfo.style.margin = '15px'
  debugInfo.style.padding = '15px'
  debugInfo.style.height = '500px'
  debugInfo.style.width = '375px'
  debugInfo.style.overflowY = 'scroll'
  leftPanel.appendChild(debugInfo)

  const predictionInfo1 = document.createElement('pre')
  predictionInfo1.id = 'prediction-info1'
  predictionInfo1.style.backgroundColor = 'white'
  predictionInfo1.style.border = '1px solid #ccc'
  predictionInfo1.style.margin = '15px'
  predictionInfo1.style.padding = '15px'
  rightPanel.appendChild(predictionInfo1)

  const predictionInfoPretty = document.createElement('div')
  predictionInfoPretty.id = 'prediction-info-pretty'
  predictionInfoPretty.style.backgroundColor = 'white'
  predictionInfoPretty.style.border = '1px solid #ccc'
  predictionInfoPretty.style.margin = '15px'
  predictionInfoPretty.style.padding = '15px'
  predictionInfoPretty.style.height = '400px'
  predictionInfoPretty.style.overflowY = 'scroll'
  rightPanel.appendChild(predictionInfoPretty)

  const predictionInfo = document.createElement('pre')
  predictionInfo.id = 'prediction-info'
  predictionInfo.style.backgroundColor = 'white'
  predictionInfo.style.border = '1px solid #ccc'
  predictionInfo.style.margin = '15px'
  predictionInfo.style.padding = '15px'
  predictionInfo.style.height = '300px'
  predictionInfo.style.overflowY = 'scroll'
  rightPanel.appendChild(predictionInfo)

}

const f = async () => {

  await updateGames(true)

  let i = setInterval(async () => {
    await updateGames()
  }, 1000)

}

f()
initUI()

const predictionsStub = []

const predictions = predictionsStub.reverse().reduce((a, c) => ({ ...a, [c.id]: c }), {})
let balance = 10.0

ipcRenderer.on('update-games', async (event, _args) => {

  const [prediction, debugInfo, prevGame, curGame] = _args
  const _debugInfo = JSON.parse(debugInfo)
  const p = _debugInfo.predictionArray[_debugInfo.predictionArray.length - 1]
  const nextGame = parseInt(curGame.id.replace('#','')) + 1
  if (predictions['#' + (nextGame - 2)]) {
    const wasCorrect = prevGame.direction === predictions['#' + (nextGame - 2)].predictedDirection
    predictions['#' + (nextGame - 2)].wasCorrect = wasCorrect
    const { payout, wager } = predictions['#' + (nextGame - 2)]
    balance += (payout * wager) - 0.00113
  }
  if (predictions['#' + (nextGame - 1)]) {
    predictions['#' + (nextGame - 1)].isCorrect = curGame.direction === predictions['#' + (nextGame - 1)].predictedDirection
    if (!predictions['#' + (nextGame - 1)].wagered) {
      predictions['#' + (nextGame - 1)].wagered = true
      balance -= predictions['#' + (nextGame - 1)].wager - 0.00113
    }
  }
  predictions['#' + nextGame] = {
    ...p,
    id: '#' + nextGame,
    wager: .1
  }

  let js = Object.keys(predictions).map(k => ({ ...predictions[k] }))
  js.reverse()

  const withPredictions = js.filter(x => (x.isCorrect !== undefined) && (x.wasCorrect !== undefined))
  // console.log('withPredictions', withPredictions)
  
  const wasCorrect = withPredictions.filter(x => x.wasCorrect)
  const isCorrect = withPredictions.filter(x => x.isCorrect)
  const isWasCorrect = withPredictions.filter(x => x.isCorrect && x.wasCorrect)
  // console.log(wasCorrect, isCorrect, isWasCorrect)
  
  const accuracy = [
    (((wasCorrect.length) / (withPredictions.length)) * 100).toFixed(2),
    (((isCorrect.length) / (withPredictions.length)) * 100).toFixed(2),
    (((isWasCorrect.length) / (withPredictions.length)) * 100).toFixed(2),
  ]
  // console.log(accuracy)

  const predictionInfoEl1 = await getElement('#prediction-info1')

  const last10AccuracyWasCorrect = withPredictions.filter((x, i) => i < 10 && x.wasCorrect)
  const last10Accuracy = (((last10AccuracyWasCorrect.length) / (10)) * 100).toFixed(2)

  predictionInfoEl1.innerText = accuracy[0] + '% was ' + wasCorrect.length + '/' + withPredictions.length + '\n'
    + last10Accuracy + '% was last 10 \n'
    + accuracy[1] + '% is\n'
    + accuracy[2] + '% is/was\n' + balance + ' BNB\n'

  console.log(js.length, last10AccuracyWasCorrect, last10Accuracy, parseFloat(last10Accuracy), !predictions['#' + nextGame].switch)

  // if ((js.length > 10) && (parseFloat(last10Accuracy) < 48) && !predictions['#' + nextGame].switch) {
  //   predictions['#' + nextGame] = {
  //     ...predictions['#' + nextGame],
  //     switch: true,
  //     predictedDirection: predictions['#' + nextGame].predictedDirection === 'up' ? 'down' : 'up'
  //   }
  // }

  js = Object.keys(predictions).map(k => ({ ...predictions[k] }))
  js.reverse()

  const debugInfoEl = await getElement('#prediction-debug-info')
  debugInfoEl.innerText = debugInfo
  const predictionInfo = JSON.stringify(js, null, 2)
  const predictionInfoEl = await getElement('#prediction-info')
  predictionInfoEl.innerText = predictionInfo

  const predictionInfoPrettyEl = await getElement('#prediction-info-pretty')
  const removedInfo = [...predictionInfoPrettyEl.children].forEach(c => predictionInfoPrettyEl.removeChild(c))
  for (let i = 0; i < js.length; i++) {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.flexDirection = 'row'

    const idEl = document.createElement('div')
    idEl.style.padding = '1px'
    idEl.style.fontFamily = 'monospace'
    idEl.innerText = js[i].id
    idEl.style.width = '75px'

    const directionEl = document.createElement('div')
    directionEl.style.padding = '1px'
    directionEl.style.fontFamily = 'monospace'
    directionEl.innerText = js[i].predictedDirection
    directionEl.style.backgroundColor = js[i].predictedDirection === 'up' ? 'aqua' : 'pink'
    directionEl.style.width = '75px'

    // const isCorrectEl = document.createElement('div')
    // isCorrectEl.style.padding = '1px'
    // isCorrectEl.style.fontFamily = 'monospace'
    // isCorrectEl.innerText = js[i].isCorrect ? js[i].isCorrect : null

    const wasCorrectEl = document.createElement('div')
    wasCorrectEl.style.padding = '1px'
    wasCorrectEl.style.fontFamily = 'monospace'
    wasCorrectEl.style.width = '75px'
    wasCorrectEl.style.backgroundColor = js[i].wasCorrect ? 'green' : 'inherit'
    wasCorrectEl.innerText = js[i].wasCorrect ? js[i].wasCorrect : null
    wasCorrectEl.innerText = js[i].switch ? `${js[i].wasCorrect === undefined ? null : js[i].wasCorrect}*` : (js[i].wasCorrect === undefined ? null : js[i].wasCorrect)

    row.appendChild(idEl)
    row.appendChild(directionEl)
    // row.appendChild(isCorrectEl)
    row.appendChild(wasCorrectEl)
    predictionInfoPrettyEl.appendChild(row)
  }

  const rowDebug = (prettyEl, debugInfoArray) => {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.flexDirection = 'row'
    row.style.justifyContent = 'flex-end'
    row.style.border = '1px solid #ccc'
    for (let i = 0; i < debugInfoArray.length; i++) {
      const idEl = document.createElement('div')
      idEl.style.padding = '1px'
      idEl.style.fontFamily = 'monospace'
      idEl.style.fontSize = '6px'
      idEl.innerText = debugInfoArray[i].gameId
      idEl.style.width = '25px'
  
      const directionEl = document.createElement('div')
      directionEl.style.padding = '1px'
      directionEl.style.fontFamily = 'monospace'
      directionEl.style.fontSize = '6px'
      directionEl.innerText = debugInfoArray[i].text
      directionEl.style.width = '25px'
  
      const wrapperEl = document.createElement('div')
  
      wrapperEl.appendChild(directionEl)
      wrapperEl.appendChild(idEl)
      row.appendChild(wrapperEl)
    }
    prettyEl.appendChild(row)
  }

  const debugInfoPrettyEl = await getElement('#prediction-debug-info-pretty')
  const removedInfoPretty = [...(debugInfoPrettyEl.children ? debugInfoPrettyEl.children : [])].forEach(c => debugInfoPrettyEl.removeChild(c))

  rowDebug(debugInfoPrettyEl, [{
    gameId: `#${nextGame - 2}`,
    text: `prev`
  },{
    gameId: `#${nextGame - 1}`,
    text: `cur`
  },{
    gameId: `#${nextGame}`,
    text: `next`
  },])

  const row = document.createElement('div')
  row.style.display = 'flex'
  row.style.flexDirection = 'row'
  row.style.justifyContent = 'flex-end'
  row.style.border = '1px solid white'
  for (let i = 0; i < _debugInfo.predictionArray.length; i++) {
    const idEl = document.createElement('div')
    idEl.style.padding = '1px'
    idEl.style.fontFamily = 'monospace'
    idEl.style.fontSize = '6px'
    idEl.innerText = _debugInfo.predictionArray[i].id
    idEl.style.width = '25px'

    const directionEl = document.createElement('div')
    directionEl.style.padding = '1px'
    directionEl.style.fontFamily = 'monospace'
    directionEl.style.fontSize = '6px'
    directionEl.innerText = _debugInfo.predictionArray[i].direction
    directionEl.style.backgroundColor = _debugInfo.predictionArray[i].direction === 'up' ? 'aqua' : 'pink'
    if (i === _debugInfo.predictionArray.length - 1) {
      directionEl.style.backgroundColor = '#eee'
      directionEl.style.color = _debugInfo.predictionArray[i].direction === 'up' ? 'aqua' : 'pink'
      directionEl.innerText = _debugInfo.predictionArray[i].predictedDirection
      idEl.innerText = '#' + (parseInt(_debugInfo.predictionArray[i - 1].id.replace('#','')) + 1)
    }
    directionEl.style.width = '25px'

    const wrapperEl = document.createElement('div')

    wrapperEl.appendChild(directionEl)
    wrapperEl.appendChild(idEl)
    row.appendChild(wrapperEl)
  }
  debugInfoPrettyEl.appendChild(row)

  _debugInfo.lcss.reverse()
  for (let i = 0; i < _debugInfo.lcss.length; i++) {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.flexDirection = 'row'
    row.style.justifyContent = 'flex-end'
    row.style.border = '1px solid white'

    for (let j = 0; j < _debugInfo.lcss[i].length; j++) {
      const idEl = document.createElement('div')
      idEl.style.padding = '1px'
      idEl.style.fontFamily = 'monospace'
      idEl.style.fontSize = '6px'
      idEl.innerText = _debugInfo.lcss[i][j].id
      idEl.style.width = '25px'

      const directionEl = document.createElement('div')
      directionEl.style.padding = '1px'
      directionEl.style.fontFamily = 'monospace'
      directionEl.style.fontSize = '6px'
      directionEl.innerText = _debugInfo.lcss[i][j].direction
      directionEl.style.backgroundColor = _debugInfo.lcss[i][j].direction === 'up' ? 'aqua' : 'pink'
      if (_debugInfo.lcss[i][j].wasNext) {
        directionEl.style.backgroundColor = '#eee'
      }
      directionEl.style.width = '25px'

      const wrapperEl = document.createElement('div')

      wrapperEl.appendChild(directionEl)
      wrapperEl.appendChild(idEl)
      row.appendChild(wrapperEl)
      if (_debugInfo.lcss[i][j].lcss) {
        row.style.border = '1px solid lime'
      }
    }

    debugInfoPrettyEl.appendChild(row)

  }

})
