import { app, ipcMain, BrowserWindow } from 'electron'
import fs from 'fs'
import '../renderer/store'

import dt from './dt'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

const existingGames = require('./existing-games.js')
const existingGamesJSON = JSON.stringify(existingGames)

let mainWindow, pancakeWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 800,
    useContentSize: true,
    width: 600
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createWindowPancakeSwap () {

  pancakeWindow = new BrowserWindow({
    height: 800,
    useContentSize: true,
    width: 1000,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  })

  pancakeWindow.loadURL(`https://pancakeswap.finance/prediction`)

  const scriptString = fs.readFileSync(__dirname + '/prediction-script.js', 'utf8')

  pancakeWindow.webContents.once('dom-ready', () => {
    pancakeWindow.webContents.executeJavaScript(scriptString)
  })

  pancakeWindow.on('closed', (_args) => {
    pancakeWindow = null
  })
}

app.on('ready', createWindowPancakeSwap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

const start = new Date().getTime()
const gamesJSON = fs.readFileSync(`${__dirname}/games.json`, 'utf8')
const gamesJS = JSON.parse(gamesJSON)
const games = gamesJS.reduce((a, cg) => ({ ...a, [cg.id]: cg }), {})

const longestCommonSubSequence = (objectArray1, objectArray2) => {
  const s1 = [...objectArray1];
  const s2 = [...objectArray2];
  const substringMatrix = Array(s2.length + 1).fill(null).map(() => {
    return Array(s1.length + 1).fill(null);
  });
  for (let columnIndex = 0; columnIndex <= s1.length; columnIndex += 1) {
    substringMatrix[0][columnIndex] = [];
  }
  for (let rowIndex = 0; rowIndex <= s2.length; rowIndex += 1) {
    substringMatrix[rowIndex][0] = [];
  }
  let longestSubstringLength = 0;
  let longestSubstringColumn = 0;
  let longestSubstringRow = 0;
  for (let rowIndex = 1; rowIndex <= s2.length; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= s1.length; columnIndex += 1) {
      if (s1[columnIndex - 1].direction === s2[rowIndex - 1].direction) {
        if (!substringMatrix[rowIndex][columnIndex]) substringMatrix[rowIndex][columnIndex] = []
        if (!substringMatrix[rowIndex - 1][columnIndex - 1]) substringMatrix[rowIndex - 1][columnIndex - 1] = []
        substringMatrix[rowIndex][columnIndex] = [
            ...substringMatrix[rowIndex - 1][columnIndex - 1],
            s1[columnIndex - 1]
        ];
      } else {
        substringMatrix[rowIndex][columnIndex] = []
      }
      if (substringMatrix[rowIndex][columnIndex].length > longestSubstringLength) {
        longestSubstringLength = substringMatrix[rowIndex][columnIndex].length;
        longestSubstringColumn = columnIndex;
        longestSubstringRow = rowIndex;
      }
    }
  }
  if (longestSubstringLength === 0) {
    return '';
  }
  let longestSubSequence = [];
  while (substringMatrix[longestSubstringRow][longestSubstringColumn].length > 0) {
    const match = s1[longestSubstringColumn - 1]
    s1[longestSubstringColumn - 1].lcss = true
    longestSubSequence.push({ ...match });
    longestSubstringRow -= 1;
    longestSubstringColumn -= 1;
  }
  longestSubSequence.reverse()
  const { direction } = s1[longestSubstringColumn + longestSubSequence.length]
  const prediction = {
    predictedDirection: direction
  }
  longestSubSequence.push({ ...prediction })
  const _lcss = substringMatrix[substringMatrix.length - 1].filter(x => x.length >= (objectArray2.length / 3))
  const lcss = _lcss.map(x => [ ...x, { ...games[`#${parseInt(x[x.length - 1].id.replace('#','')) + 1}`], wasNext: true } ])
  const __lcss = _lcss.map(x => [ { ...games[`#${parseInt(x[x.length - 1].id.replace('#','')) + 1}`] } ])
  return [longestSubSequence, lcss, __lcss];
}

const predictGames = () => {
  const numGames = Object.keys(games)
  if (numGames.length >= 16) {
    const gamesMap = numGames
      .map((gameKey) => games[gameKey])
    const from = gamesMap.filter((g,i) => i < gamesMap.length - 1 - 10)
    const _with = gamesMap.filter((g,i) => i >= gamesMap.length - 1 - 10)
    // console.log('from', from)
    // console.log('_with', _with)
    const prediction = longestCommonSubSequence(from, _with)
    return prediction
  }
  return ['Not enough games.']
}

const updatePrediction = async (start) => {
  const now = new Date().getTime()
  const [predictionArray, lcss, _lcss] = predictGames()
  const prediction = predictionArray[predictionArray.length - 1]
  const time = (((now - start)/1000)/60).toFixed(1)
  const timeLabel = time + ' minutes'
  const output = prediction === 'Not enough games.' ? prediction : JSON.stringify({ since: new Date(start), time: timeLabel, ...prediction }, null, 2)
  return Promise.resolve(output)
}

const updateDebugInfo = async (start) => {
  const now = new Date().getTime()
  const [predictionArray, lcss, _lcss] = predictGames()
  const prediction = predictionArray[predictionArray.length - 1]
  const time = ((now - start)/1000).toFixed(0)
  const timeLabel = time + ' seconds'
  const numGames = Object.keys(games)
  const debugInfo = { since: new Date(start), time: timeLabel, numGames: numGames.length, predictionArray, _lcss, lcss }
  const output = JSON.stringify(debugInfo, null, 2)
  return Promise.resolve(output)
}

const decisionTree = async () => {
  // Training set
  const data = Object.keys(games).map(key => ({ ...games[key] }))
  const curGame = data.pop()

  // Configuration
  const config = {
      trainingSet: data, 
      categoryAttr: 'direction', 
      ignoredAttributes: ['payout']
  }

  // Building Decision Tree
  const decisionTree = new dt.DecisionTree(config)

  // Building Random Forest
  // const numberOfTrees = 3
  // const randomForest = new dt.RandomForest(config, numberOfTrees)

  // Testing Decision Tree and Random Forest
  const comic = curGame

  const decisionTreePrediction = decisionTree.predict(comic)
  console.log(decisionTreePrediction)
  // const randomForestPrediction = randomForest.predict(comic)
}

ipcMain.on('update-games', async (event, arg) => {
  console.log('update-games', arg)
  const [prevGame, curGame, init] = arg
  games[prevGame.id] = prevGame
  games[curGame.id] = curGame
  const js = Object.keys(games).map(key => ({ ...games[key] }))
  fs.writeFileSync(__dirname + '/games.json', JSON.stringify(js, null, 2), 'utf8')
  const prediction = await updatePrediction(start)
  const debugInfo = await updateDebugInfo(start)
  pancakeWindow.webContents.send('update-games', [prediction, debugInfo, prevGame, curGame])
  await decisionTree()
})
