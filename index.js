require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
const _ = require('lodash');
const PORT = 3000;

const app = express();
app.use(cookieParser());
// use this middleware before using bodyParser
app.use(function (req, res, next) {
  req.rawBody = '';

  req.on('data', function (chunk) {
    req.rawBody += chunk;
  });

  next();
});

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true,
  })
);

app.get('/avaamo', async (req, res) => {
  try {
    const textResult = await axios.get('http://norvig.com/big.txt');
    const textString = textResult.data;

    const wordList = textString.split(/[\s\n,.()"*!\[\]\\:;?-]+/);

    const wordCount = wordList.reduce(
      (res, word) => ((res[word] = (res[word] || 0) + 1), res),
      {}
    );

    const wordCountList = Object.keys(wordCount).map((key) => ({ key, value: wordCount[key] }));

    const topTenWordWithCount = _.sortBy(wordCountList, 'value', ['desc'])
      .reverse()
      .slice(0, 10);

    const outputResultList = [];

    for (let i = 0; i < topTenWordWithCount.length; i++) {
      const wordWithCount = topTenWordWithCount[i];
      const yandexResult = await axios.get(
        'https://dictionary.yandex.net/api/v1/dicservice.json/lookup',
        {
          params: {
            lang: 'en-en',
            key:
              'dict.1.1.20210302T174037Z.d83681b1ed2fcd73.b19ea5b69041dbae94e9ba07cc37c02c9aed367f',
            text: wordWithCount.key,
          },
        }
      );

      outputResultList.push({
        word: wordWithCount.key,
        output: {
          count: wordWithCount.value,
          synonyms: getSynonyms(yandexResult.data),
        },
      });
    }

    res.json({ result: outputResultList });
  } catch (err) {
    console.log(err.message);
    res.send({ msg: 'Server error' });
  }
});

function getSynonyms(jsonData) {
  const { def = [] } = jsonData;
  const synonymsArr = [];
  if (!_.isEmpty(def)) {
    def.forEach((eachDefObj) => {
      const { tr = [] } = eachDefObj || {};
      if (!_.isEmpty(tr)) {
        tr.forEach((eachTrObj) => {
          const { syn = [] } = eachTrObj || {};
          if (!_.isEmpty(syn)) {
            syn.forEach((eachSynObj) => {
              const { text, pos } = eachSynObj || {};
              if (text) {
                synonymsArr.push({ text, pos });
              }
            });
          }
        });
      }
    });
  }

  return synonymsArr;
}

app.listen(PORT, () => {
  console.log('avaamo app listening on port ' + PORT + '!');
});
