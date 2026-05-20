const TOKEN_KEY_PICKS = ['url', 'params', 'method', 'data', 'urlParams', 'options'];

const djb2Hash = str => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash.toString(36);
};

const getRequestToken = props => {
  const obj = {};
  for (const key of TOKEN_KEY_PICKS) {
    if (props[key] !== undefined) {
      obj[key] = props[key];
    }
  }
  return djb2Hash(JSON.stringify(obj));
};

export default getRequestToken;
