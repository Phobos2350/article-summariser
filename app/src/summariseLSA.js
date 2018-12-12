const stopwords = require('stopword')
const natural = require('natural')
const svd = require('numeric')
const retext = require('retext');
const keywords = require('retext-keywords');
const nlcstToString = require('nlcst-to-string');
const textStats = require('text-statistics')
const utils = require('./utils')
const dimensionsMin = 3
const reductionRatio = 1 / 1

const tokenizer = new natural.WordTokenizer()
natural.PorterStemmer.attach();

const createDictionary = (content) => {
    let words = content.tokenizeAndStem()
    let stripStopwords = stopwords.removeStopwords(words)
    let wordsMap = stripStopwords.map((x, i) => [x, stripStopwords[i]])
    let uniques = new Set()
    for (let w of wordsMap) {
        if (!uniques.has(w[0]) && w[0].length > 3) {
            uniques.add(w[0])
        }
    }
    let sentenceDict = [...uniques].map((w, i) => [w, i])
    return new Map(sentenceDict)
}

const createMatrix = (content, dictionary, keyWords) => {
  let sentences = utils.splitNewlines(content)
  let numWords = dictionary.size
  let numSentences = sentences.length
  // let matrix = utils.range(0, numWords).map((x) => {
  //   let result = []
  //   for (let x of utils.range(0, numSentences)) {
  //     result.push(0)
  //   }
  //   return result
  // })
  let matrix = utils.matrix(numWords, numSentences)
  for (let sentence of sentences.entries()) {
    for (let word of sentence[1].tokenizeAndStem()) {
      if (dictionary.has(word)) {
        let row = dictionary.get(word)
        if (keyWords.has(word)) {
          matrix[row][sentence[0]] += 3
        } else {
          matrix[row][sentence[0]] += 1
        }
      }
    }
  }
  return matrix
}

const computeTermFrequencies = (matrix) => {
  let smooth = 0.4
  let maxWordFrequencies = []
  for (let i of matrix) {
    if (Math.max(...i) > Math.max(...maxWordFrequencies)) {
      maxWordFrequencies = i
    }
  }
  for (let row of utils.range(0, matrix.length)) {
    for (let col of utils.range(0, matrix[0].length)) {
      let maxWordFreq = maxWordFrequencies[col]
      if (maxWordFreq !== 0) {
        let freq = matrix[row][col] / maxWordFreq
        matrix[row][col] = smooth + (1.0 - smooth) * freq
      }
    }
  }
  return matrix
}

const computeRanks = (sigmaMatrix, vMatrix) => {
  let dimensions = Math.max(dimensionsMin, (sigmaMatrix.length * reductionRatio))
  let sigmaSquared = []
  for (let s of sigmaMatrix.entries()) {
    if (s[0] < dimensions) {
      sigmaSquared.push(utils.squared(s[1]))
    } else {
      sigmaSquared.push(0.0)
    }
  }

  let ranks = []
  let transposedVMatrix = utils.transposeMatrix(vMatrix)
  for (let colVector of transposedVMatrix) {
    let rank = 0
    for (let s of utils.zipMatrices(colVector, sigmaSquared)) {
      rank += utils.squared(s[0] * s[1])
      ranks.push(Math.sqrt(rank))
    }
  }
  return ranks
}

const getBestSentences = (sentences, desiredLength, ranks) => {
  let infos = []
  for (let s of sentences.entries()) {
    let order = s[0]
    let sentence = s[1]
    let rating = 0
    let numWords = tokenizer.tokenize(s[1]).length
    if (numWords > 10) {
      // Weigh the first sentence highly, it's often a good intro regardless
      if (order === 0) {
        rating = ranks[order] * 1.2
      } else {
        rating = ranks[order]
      }
    } else {
      // If it's a short sentence, reduce the sentence weighting, it may be a sub-heading etc.
      rating = ranks[order] * 0.25
    }

    let obj = {sentence, order, rating}
    infos.push(obj)
  }
  infos = infos.sort((a, b) => b.rating - a.rating)
  infos = infos.slice(0, desiredLength)
  infos = infos.sort((a, b) => a.order - b.order)
  return [...infos].map((i) => i.sentence)
}

const getKeywords = (content) => {
  let words = []
  retext()
    .use(keywords)
    .process(content, (err, res) => {
      if (err) throw err
      res.data.keywords.forEach(k => {
        words.push(nlcstToString(k.matches[0].node))
      })
    })
  return words
}

const getReadability = (content) => {
  let ts = new textStats(content)
  let readability = ts.fleschKincaidReadingEase()

  if (readability >= 90)
    return "Very Easy / Pre-School Age"
  else if (readability >= 80)
    return "Easy / Primary-School Age"
  else if (readability >= 70)
    return "Fairly Easy / High-School Age"
  else if (readability >= 60)
    return "Moderate / Average Adult Level"
  else if (readability >= 50)
    return "Challenging / Complex Adult Level"
  else if (readability >= 40)
    return "Difficult / University Level"
  else 
    return "Very Difficult / Post-Graduate Level"
}

const summariseLSA = (content, desiredLength) => {
  let summary = []
  let keyWords = new Set()
  let sentenceDict = createDictionary(content)
  let matrix = createMatrix(content, sentenceDict, keyWords)
  matrix = computeTermFrequencies(matrix)
  let svds = svd.svd(matrix)
  let ranks = computeRanks(svds.S, svds.V)
  let sentences = utils.splitNewlines(content)
  if (desiredLength < 1) desiredLength = 5
  let bestSentences = getBestSentences(sentences, desiredLength, ranks)
  for (let s of bestSentences) {
    summary.push(s)
  }
  let keywords = getKeywords(content)
  let readabilityBefore = getReadability(content)
  let summaryConcat = summary.join(' ')
  let readabilityAfter = getReadability(summaryConcat)
  let countBefore = tokenizer.tokenize(content).length
  let countAfter = tokenizer.tokenize(summaryConcat).length
  let readTimeBefore = countBefore / 300
  let readTimeAfter = countAfter / 300
  let reduction = 100 - ((countAfter / countBefore) * 100)
  let stats = {
    "Before_Length": countBefore,
    "After_Length": countAfter,
    "Before_Read_Time": readTimeBefore,
    "After_Read_Time": readTimeAfter,
    "Percent_Reduction": Math.round(reduction),
    "Before_Readability": readabilityBefore,
    "After_Readability": readabilityAfter
  }
  let result = { 
    "Key Terms": keywords,
    "Stats": stats,
    "Summary": summary
  }
  //console.log(result)
  return result
}

export default summariseLSA
