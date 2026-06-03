const TOKEN_KEY_PICKS = ['url', 'params', 'method', 'data', 'urlParams', 'options'];

const djb2Hash = str => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash.toString(36);
};

const normalizeValue = (value, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return `[Function:${value.name || 'anonymous'}]`;
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) return value.toString();
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map(item => normalizeValue(item, seen));
  }
  const output = {};
  Object.keys(value)
    .sort()
    .forEach(key => {
      output[key] = normalizeValue(value[key], seen);
    });
  return output;
};

const getRequestToken = props => {
  const obj = {};
  for (const key of TOKEN_KEY_PICKS) {
    if (props[key] !== undefined) {
      obj[key] = normalizeValue(props[key]);
    }
  }
  return djb2Hash(JSON.stringify(obj));
};

export default getRequestToken;
