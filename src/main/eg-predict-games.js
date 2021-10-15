const fs = require('fs')
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
  const _lcss = substringMatrix[substringMatrix.length - 1].filter(x => x.length >= (objectArray2.length / 2))
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
    console.log('from', from)
    console.log('_with', _with)
    const prediction = longestCommonSubSequence(from, _with)
    return prediction
  }
  return ['Not enough games.']
}

const main = () => {
  const prediction = predictGames()  
}

main()